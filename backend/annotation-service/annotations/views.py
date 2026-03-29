import csv
import json
import requests
from io import StringIO

from django.db import transaction
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ImageFile, Annotation
from .serializers import (
    ImageFileSerializer, ImageUploadSerializer,
    AnnotationSerializer, AnnotationCreateSerializer, AnnotationUpdateSerializer,
    BulkAnnotationSerializer,
)
from .permissions import IsAnnotatorOrReviewerOrManager, IsAnnotator, IsInternalService
from .utils import success_response, error_response


# ─── SERVICE HELPERS ─────────────────────────────────────────────────────────

def _update_task_counter(task_id):
    """Cập nhật completed_images + total_images vào task-service. Fire-and-forget."""
    from django.conf import settings
    try:
        total = ImageFile.objects.filter(task_id=task_id).count()
        completed = ImageFile.objects.filter(task_id=task_id, is_confirmed=True).count()
        requests.patch(
            f'{settings.TASK_SERVICE_URL}/api/tasks/internal/tasks/{task_id}/counters/',
            json={
                'total_images': total,
                'completed_images': completed,
            },
            headers={'X-Internal-Service': 'true'},
            timeout=2,
        )
    except Exception:
        pass  # Không để lỗi counter sync ảnh hưởng annotation flow


# ─── IMAGE VIEWS ──────────────────────────────────────────────────────────────

class ImageListView(APIView):
    """
    GET /api/annotations/images/?task_id=<id>
    GET /api/annotations/images/?project_id=<id>&unassigned=true  — ảnh chưa assign task
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def get(self, request):
        task_id    = request.query_params.get('task_id')
        project_id = request.query_params.get('project_id')
        unassigned = request.query_params.get('unassigned') == 'true'

        if task_id:
            images = ImageFile.objects.filter(task_id=task_id).order_by('index')
        elif project_id and unassigned:
            images = ImageFile.objects.filter(project_id=project_id, task_id__isnull=True).order_by('index')
        elif project_id:
            images = ImageFile.objects.filter(project_id=project_id).order_by('index')
        else:
            return error_response('Thiếu task_id hoặc project_id.', status=400)

        serializer = ImageFileSerializer(images, many=True)
        return success_response(serializer.data)


class ImageUploadView(APIView):
    """
    POST /api/annotations/images/upload/
    Upload 1 ảnh. task_id tuỳ chọn — nếu không có thì ảnh vào project pool chưa assign.
    Form data: file, project_id, task_id (optional), dataset_id (optional)
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        task_id    = serializer.validated_data.get('task_id')
        project_id = serializer.validated_data['project_id']

        # Xác định index tiếp theo (theo task hoặc project pool)
        if task_id:
            last = ImageFile.objects.filter(task_id=task_id).order_by('-index').first()
        else:
            last = ImageFile.objects.filter(project_id=project_id, task_id__isnull=True).order_by('-index').first()
        next_index = (last.index + 1) if last else 0

        try:
            image = serializer.save_image(index=next_index)
        except Exception as e:
            return error_response(f'Lưu file thất bại: {str(e)}', status=500)

        # Nếu upload vào task, cập nhật counter
        if task_id:
            _update_task_counter(task_id)

        return success_response(
            ImageFileSerializer(image).data,
            message='Upload ảnh thành công.',
            status=201,
        )


class ImageDetailView(APIView):
    """
    GET    /api/annotations/images/<pk>/
    DELETE /api/annotations/images/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def _get_image(self, pk):
        try:
            return ImageFile.objects.get(pk=pk)
        except ImageFile.DoesNotExist:
            return None

    def get(self, request, pk):
        image = self._get_image(pk)
        if not image:
            return error_response('Không tìm thấy ảnh.', status=404)
        return success_response(ImageFileSerializer(image).data)

    def delete(self, request, pk):
        image = self._get_image(pk)
        if not image:
            return error_response('Không tìm thấy ảnh.', status=404)

        # Chỉ annotator của task hoặc manager mới được xóa
        if request.user.role not in ('manager',) and image.is_confirmed:
            return error_response('Không thể xóa ảnh đã được confirm.', status=400)

        image.delete()
        return success_response(message='Đã xóa ảnh.')


class ImageConfirmView(APIView):
    """
    POST /api/annotations/images/<pk>/confirm/
    Annotator đánh dấu đã hoàn thành label ảnh này.
    """
    permission_classes = [IsAuthenticated, IsAnnotator]

    def post(self, request, pk):
        try:
            image = ImageFile.objects.get(pk=pk)
        except ImageFile.DoesNotExist:
            return error_response('Không tìm thấy ảnh.', status=404)

        if image.is_confirmed:
            return error_response('Ảnh này đã được confirm rồi.', status=400)

        image.is_confirmed = True
        image.save(update_fields=['is_confirmed'])

        # Luồng 4: đồng bộ counter sang task-service
        _update_task_counter(image.task_id)

        return success_response(
            ImageFileSerializer(image).data,
            message='Đã confirm ảnh.',
        )


# ─── ANNOTATION CRUD VIEWS ────────────────────────────────────────────────────

class AnnotationListCreateView(APIView):
    """
    GET  /api/annotations/?image_id=<id>   — list annotations của 1 ảnh
    POST /api/annotations/                 — tạo 1 annotation mới
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def get(self, request):
        image_id = request.query_params.get('image_id')
        if not image_id:
            return error_response('Thiếu image_id.', status=400)

        annotations = Annotation.objects.filter(image_id=image_id).order_by('created_at')
        serializer = AnnotationSerializer(annotations, many=True)
        return success_response(serializer.data)

    def post(self, request):
        serializer = AnnotationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        data = serializer.validated_data
        image_id = data.pop('image_id')

        try:
            image = ImageFile.objects.get(pk=image_id)
        except ImageFile.DoesNotExist:
            return error_response('Không tìm thấy ảnh.', status=404)

        annotation = Annotation.objects.create(
            image=image,
            created_by=request.user.id,
            **data,
        )
        return success_response(
            AnnotationSerializer(annotation).data,
            message='Tạo annotation thành công.',
            status=201,
        )


class AnnotationDetailView(APIView):
    """
    GET    /api/annotations/<pk>/
    PATCH  /api/annotations/<pk>/
    DELETE /api/annotations/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def _get_annotation(self, pk):
        try:
            return Annotation.objects.get(pk=pk)
        except Annotation.DoesNotExist:
            return None

    def get(self, request, pk):
        annotation = self._get_annotation(pk)
        if not annotation:
            return error_response('Không tìm thấy annotation.', status=404)
        return success_response(AnnotationSerializer(annotation).data)

    def patch(self, request, pk):
        annotation = self._get_annotation(pk)
        if not annotation:
            return error_response('Không tìm thấy annotation.', status=404)

        # Chỉ người tạo hoặc manager mới được sửa
        if annotation.created_by != request.user.id and request.user.role != 'manager':
            return error_response('Bạn không có quyền sửa annotation này.', status=403)

        serializer = AnnotationUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        for field, value in serializer.validated_data.items():
            setattr(annotation, field, value)
        annotation.save()

        return success_response(
            AnnotationSerializer(annotation).data,
            message='Cập nhật annotation thành công.',
        )

    def delete(self, request, pk):
        annotation = self._get_annotation(pk)
        if not annotation:
            return error_response('Không tìm thấy annotation.', status=404)

        if annotation.created_by != request.user.id and request.user.role != 'manager':
            return error_response('Bạn không có quyền xóa annotation này.', status=403)

        annotation.delete()
        return success_response(message='Đã xóa annotation.')


# ─── BULK SAVE + TASK WORKFLOW VIEWS ─────────────────────────────────────────

class BulkAnnotationSaveView(APIView):
    """
    POST /api/annotations/images/<pk>/annotations/bulk-save/

    Annotator save toàn bộ annotations của 1 ảnh cùng lúc (atomic).
    Xóa hết annotations cũ, insert lại từ đầu.
    Body: { "annotations": [ { label_id, label_name, ... }, ... ] }
    """
    permission_classes = [IsAuthenticated, IsAnnotator]

    def post(self, request, pk):
        try:
            image = ImageFile.objects.get(pk=pk)
        except ImageFile.DoesNotExist:
            return error_response('Không tìm thấy ảnh.', status=404)

        serializer = BulkAnnotationSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        items = serializer.validated_data['annotations']

        with transaction.atomic():
            # Xóa toàn bộ annotations cũ của ảnh này
            Annotation.objects.filter(image=image).delete()

            # Insert lại
            new_annotations = [
                Annotation(image=image, created_by=request.user.id, **item)
                for item in items
            ]
            Annotation.objects.bulk_create(new_annotations)

        saved = Annotation.objects.filter(image=image).order_by('created_at')
        return success_response(
            AnnotationSerializer(saved, many=True).data,
            message=f'Đã lưu {len(new_annotations)} annotation.',
        )


class TaskImagesWithAnnotationsView(APIView):
    """
    GET /api/annotations/tasks/<task_id>/images/

    Reviewer xem toàn bộ ảnh + annotations của 1 task để review.
    Trả về list ảnh, mỗi ảnh kèm nested annotations.
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def get(self, request, task_id):
        images = ImageFile.objects.filter(task_id=task_id).order_by('index')

        result = []
        for image in images:
            annotations = Annotation.objects.filter(image=image).order_by('created_at')
            result.append({
                **ImageFileSerializer(image).data,
                'annotations': AnnotationSerializer(annotations, many=True).data,
            })

        return success_response(result)


# ─── EXPORT VIEWS ─────────────────────────────────────────────────────────────

class TaskExportView(APIView):
    """
    GET /api/annotations/tasks/<task_id>/export/?format=coco|yolo|csv

    Export toàn bộ annotations của task ra file download.
    - coco  → JSON theo COCO format
    - yolo  → .txt files gộp trong JSON (relative coords)
    - csv   → CSV file
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def get(self, request, task_id):
        fmt = request.query_params.get('format', 'coco').lower()
        if fmt not in ('coco', 'yolo', 'csv'):
            return error_response('format phải là coco, yolo hoặc csv.', status=400)

        images = ImageFile.objects.filter(task_id=task_id).prefetch_related('annotations').order_by('index')
        if not images.exists():
            return error_response('Không có ảnh nào trong task này.', status=404)

        if fmt == 'coco':
            return self._export_coco(task_id, images)
        elif fmt == 'yolo':
            return self._export_yolo(task_id, images)
        else:
            return self._export_csv(task_id, images)

    def _export_coco(self, task_id, images):
        coco = {
            'info': {'task_id': task_id, 'version': '1.0'},
            'images': [],
            'annotations': [],
            'categories': [],
        }
        category_map = {}
        ann_id = 1

        for image in images:
            coco['images'].append({
                'id': image.id,
                'file_name': image.original_filename,
                'width': image.width,
                'height': image.height,
            })
            for ann in image.annotations.all():
                if ann.label_id not in category_map:
                    cat_id = len(category_map) + 1
                    category_map[ann.label_id] = cat_id
                    coco['categories'].append({
                        'id': cat_id,
                        'name': ann.label_name,
                        'supercategory': '',
                    })
                coco['annotations'].append({
                    'id': ann_id,
                    'image_id': image.id,
                    'category_id': category_map[ann.label_id],
                    'bbox': [ann.x, ann.y, ann.width, ann.height],
                    'segmentation': ann.points or [],
                    'area': ann.width * ann.height,
                    'iscrowd': 0,
                })
                ann_id += 1

        response = HttpResponse(
            json.dumps(coco, ensure_ascii=False, indent=2),
            content_type='application/json',
        )
        response['Content-Disposition'] = f'attachment; filename="task_{task_id}_coco.json"'
        return response

    def _export_yolo(self, task_id, images):
        result = {}
        for image in images:
            if image.width == 0 or image.height == 0:
                continue
            lines = []
            for ann in image.annotations.all():
                cx = (ann.x + ann.width / 2) / image.width
                cy = (ann.y + ann.height / 2) / image.height
                w = ann.width / image.width
                h = ann.height / image.height
                lines.append(f'0 {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}')
            result[image.original_filename] = '\n'.join(lines)

        response = HttpResponse(
            json.dumps(result, ensure_ascii=False, indent=2),
            content_type='application/json',
        )
        response['Content-Disposition'] = f'attachment; filename="task_{task_id}_yolo.json"'
        return response

    def _export_csv(self, task_id, images):
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            'image_id', 'filename', 'label_id', 'label_name', 'label_color',
            'annotation_type', 'x', 'y', 'width', 'height', 'comment',
        ])
        for image in images:
            for ann in image.annotations.all():
                writer.writerow([
                    image.id, image.original_filename,
                    ann.label_id, ann.label_name, ann.label_color,
                    ann.annotation_type,
                    ann.x, ann.y, ann.width, ann.height,
                    ann.comment,
                ])
        response = HttpResponse(buf.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="task_{task_id}_annotations.csv"'
        return response


# ─── PROJECT IMAGE POOL VIEWS ────────────────────────────────────────────────

class ProjectImagePoolView(APIView):
    """
    GET  /api/annotations/projects/<project_id>/images/
         Lấy danh sách ảnh chưa assign task (project pool).
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def get(self, request, project_id):
        images = ImageFile.objects.filter(
            project_id=project_id, task_id__isnull=True
        ).order_by('index')
        serializer = ImageFileSerializer(images, many=True)
        return success_response({
            'project_id': project_id,
            'unassigned_count': images.count(),
            'images': serializer.data,
        })


class ProjectAssignImagesView(APIView):
    """
    POST /api/annotations/projects/<project_id>/assign/
    Gán N ảnh đầu tiên chưa assign từ project pool vào task.
    Body: { task_id: int, count: int }

    Manager gọi sau khi tạo task để pull ảnh từ pool vào task.
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def post(self, request, project_id):
        task_id = request.data.get('task_id')
        count   = request.data.get('count')

        if not task_id or not count:
            return error_response('Thiếu task_id hoặc count.', status=400)

        try:
            task_id = int(task_id)
            count   = int(count)
        except (ValueError, TypeError):
            return error_response('task_id và count phải là số nguyên.', status=400)

        if count <= 0:
            return error_response('count phải lớn hơn 0.', status=400)

        # Lấy N ảnh chưa assign theo thứ tự index
        unassigned = ImageFile.objects.filter(
            project_id=project_id, task_id__isnull=True
        ).order_by('index')[:count]

        if not unassigned:
            return error_response('Không có ảnh nào trong project pool.', status=400)

        # Assign vào task, cập nhật index theo thứ tự trong task
        task_last = ImageFile.objects.filter(task_id=task_id).order_by('-index').first()
        start_index = (task_last.index + 1) if task_last else 0

        assigned_ids = []
        with transaction.atomic():
            for i, image in enumerate(unassigned):
                image.task_id = task_id
                image.index   = start_index + i
                image.save(update_fields=['task_id', 'index'])
                assigned_ids.append(image.id)

        _update_task_counter(task_id)

        return success_response({
            'task_id': task_id,
            'assigned_count': len(assigned_ids),
            'image_ids': assigned_ids,
        }, message=f'Đã gán {len(assigned_ids)} ảnh vào task {task_id}.')


# ─── INTERNAL API VIEWS ───────────────────────────────────────────────────────

class InternalTaskStatusView(APIView):
    """
    GET /api/annotations/internal/tasks/<task_id>/status/
    Header: X-Internal-Service: true

    task-service hỏi: tỷ lệ ảnh đã confirm của task là bao nhiêu?
    """
    permission_classes = [IsInternalService]

    def get(self, request, task_id):
        total = ImageFile.objects.filter(task_id=task_id).count()
        if total == 0:
            return success_response({'task_id': task_id, 'total': 0, 'confirmed': 0, 'percent': 0})

        confirmed = ImageFile.objects.filter(task_id=task_id, is_confirmed=True).count()
        percent = round(confirmed / total * 100, 1)

        return success_response({
            'task_id': task_id,
            'total': total,
            'confirmed': confirmed,
            'percent': percent,
            'is_done': confirmed == total,
        })


class InternalTaskExportView(APIView):
    """
    GET /api/annotations/internal/tasks/<task_id>/export/
    Header: X-Internal-Service: true

    task-service lấy raw annotation data khi đóng gói task completed.
    """
    permission_classes = [IsInternalService]

    def get(self, request, task_id):
        images = ImageFile.objects.filter(task_id=task_id).prefetch_related('annotations').order_by('index')

        result = []
        for image in images:
            result.append({
                'image_id': image.id,
                'index': image.index,
                'filename': image.original_filename,
                'width': image.width,
                'height': image.height,
                'is_confirmed': image.is_confirmed,
                'annotations': AnnotationSerializer(
                    image.annotations.all(), many=True
                ).data,
            })

        return success_response({'task_id': task_id, 'images': result})
