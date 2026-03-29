from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('annotations', '0001_initial'),
    ]

    operations = [
        # task_id nullable — ảnh chưa assign task
        migrations.AlterField(
            model_name='imagefile',
            name='task_id',
            field=models.IntegerField(db_index=True, null=True, blank=True),
        ),
        # Bỏ unique_together cũ (task_id, index) vì task_id có thể null
        migrations.AlterUniqueTogether(
            name='imagefile',
            unique_together=set(),
        ),
        # Cập nhật ordering
        migrations.AlterModelOptions(
            name='imagefile',
            options={'ordering': ['project_id', 'task_id', 'index']},
        ),
    ]
