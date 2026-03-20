from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ImageFile, Annotation
from .serializers import (
    ImageFileSerializer, ImageUploadSerializer,
    AnnotationSerializer, AnnotationCreateSerializer, AnnotationUpdateSerializer,
)
from .permissions import IsAnnotatorOrReviewerOrManager, IsAnnotator, IsInternalService
from .utils import success_response, error_response


# ─── IMAGE VIEWS ──────────────────────────────────────────────────────────────

class ImageListView(APIView):
    """
    GET /api/annotations/images/?task_id=<id>
    Lấy danh sách ảnh của 1 task.
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]

    def get(self, request):
        task_id = request.query_params.get('task_id')
        if not task_id:
            return error_response('Thiếu task_id.', status=400)

        images = ImageFile.objects.filter(task_id=task_id).order_by('index')
        serializer = ImageFileSerializer(images, many=True)
        return success_response(serializer.data)


class ImageUploadView(APIView):
    """
    POST /api/annotations/images/upload/
    Upload 1 ảnh cho task. Gọi nhiều lần để upload nhiều ảnh.
    Form data: file, task_id, project_id, dataset_id (optional)
    """
    permission_classes = [IsAuthenticated, IsAnnotatorOrReviewerOrManager]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response('Dữ liệu không hợp lệ.', errors=serializer.errors)

        task_id = serializer.validated_data['task_id']

        # Xác định index tiếp theo cho task này
        last = ImageFile.objects.filter(task_id=task_id).order_by('-index').first()
        next_index = (last.index + 1) if last else 0

        try:
            image = serializer.save_image(index=next_index)
        except Exception as e:
            return error_response(f'Lưu file thất bại: {str(e)}', status=500)

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
