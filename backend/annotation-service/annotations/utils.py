from rest_framework.response import Response


def success_response(data=None, message='', status=200):
    """Trả về response chuẩn {success, data, message, errors}."""
    return Response(
        {'success': True, 'data': data, 'message': message, 'errors': None},
        status=status,
    )


def error_response(message='', errors=None, status=400):
    """Trả về error response chuẩn."""
    return Response(
        {'success': False, 'data': None, 'message': message, 'errors': errors},
        status=status,
    )
