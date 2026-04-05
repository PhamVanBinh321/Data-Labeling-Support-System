from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response


def _fetchall(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _fetchone(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        row = cursor.fetchone()
        return dict(zip(cols, row)) if row else {}


class HealthView(APIView):
    def get(self, request):
        return Response({'service': 'admin-service', 'status': 'ok'})


class OverviewView(APIView):
    """GET /api/admin/overview/ — tổng quan toàn hệ thống"""
    def get(self, request):
        data = _fetchone('''
            SELECT
                COUNT(DISTINCT project_id) AS total_projects,
                COALESCE(SUM(total_tasks), 0) AS total_tasks,
                COALESCE(SUM(total_images), 0) AS total_images,
                MAX(synced_at) AS synced_at
            FROM rpt_project_stats
        ''')
        return Response({'success': True, 'data': data})


class ProjectStatsView(APIView):
    """GET /api/admin/projects/ — stats từng project"""
    def get(self, request):
        data = _fetchall('SELECT * FROM rpt_project_stats ORDER BY project_id')
        return Response({'success': True, 'data': data})


class UserActivityView(APIView):
    """GET /api/admin/users/ — hoạt động từng user"""
    def get(self, request):
        data = _fetchall('SELECT * FROM rpt_user_activity ORDER BY total_tasks DESC')
        return Response({'success': True, 'data': data})


class AnnotationStatsView(APIView):
    """GET /api/admin/annotations/ — phân bố annotation theo label"""
    def get(self, request):
        project_id = request.query_params.get('project_id')
        if project_id:
            data = _fetchall(
                'SELECT * FROM rpt_annotation_stats WHERE project_id = %s ORDER BY annotation_count DESC',
                [project_id]
            )
        else:
            data = _fetchall('SELECT * FROM rpt_annotation_stats ORDER BY project_id, annotation_count DESC')
        return Response({'success': True, 'data': data})
