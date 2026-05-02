from django.db import transaction
from django.utils import timezone
from tasks.models import Task

def round_robin_assign(project_id: int, annotator_ids: list, task_limit: int = 10) -> dict:
    """
    Chia đều các task PENDING cho danh sách annotator theo thuật toán chia bài (round-robin).
    """
    if not annotator_ids:
        return {"assigned_count": 0, "details": {}}

    num_annotators = len(annotator_ids)
    
    with transaction.atomic():
        # Lấy các task PENDING và khóa dòng để tránh bị lấy trùng
        pending_tasks = Task.objects.select_for_update().filter(
            project_id=project_id,
            status=Task.Status.PENDING
        ).order_by('created_at')[:task_limit]

        tasks_to_update = []
        assigned_details = {annotator_id: 0 for annotator_id in annotator_ids}
        
        now = timezone.now()

        for idx, task in enumerate(pending_tasks):
            annotator_id = annotator_ids[idx % num_annotators]
            task.annotator_id = annotator_id
            task.status = Task.Status.IN_PROGRESS
            task.assigned_at = now
            tasks_to_update.append(task)
            assigned_details[annotator_id] += 1

        if tasks_to_update:
            Task.objects.bulk_update(tasks_to_update, ['annotator_id', 'status', 'assigned_at'])

    return {
        "assigned_count": len(tasks_to_update),
        "details": assigned_details
    }
