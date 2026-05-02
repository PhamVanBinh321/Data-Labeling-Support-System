from projects.models import Project
from projects.serializers import ProjectDetailSerializer, DatasetSerializer

def generate_snapshot_data(project_id: int) -> dict:
    """
    Tạo dữ liệu snapshot cho một dự án.
    Bao gồm thông tin chi tiết project, danh sách labels, và các datasets.
    """
    try:
        project = Project.objects.prefetch_related('labels', 'datasets').get(id=project_id)
    except Project.DoesNotExist:
        return {}

    # Sử dụng serializer để lấy metadata chuẩn
    project_data = ProjectDetailSerializer(project).data
    datasets = project.datasets.all()
    datasets_data = DatasetSerializer(datasets, many=True).data
    
    return {
        "version": "1.0",
        "project": project_data,
        "datasets": datasets_data,
    }
