from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='ImageFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('task_id', models.IntegerField(db_index=True)),
                ('project_id', models.IntegerField(db_index=True)),
                ('dataset_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('index', models.IntegerField()),
                ('file_path', models.CharField(max_length=500)),
                ('original_filename', models.CharField(blank=True, default='', max_length=255)),
                ('width', models.IntegerField(default=0)),
                ('height', models.IntegerField(default=0)),
                ('is_confirmed', models.BooleanField(default=False)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'image_files',
                'ordering': ['task_id', 'index'],
            },
        ),
        migrations.CreateModel(
            name='Annotation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label_id', models.CharField(max_length=100)),
                ('label_name', models.CharField(max_length=100)),
                ('label_color', models.CharField(max_length=7)),
                ('x', models.FloatField(default=0)),
                ('y', models.FloatField(default=0)),
                ('width', models.FloatField(default=0)),
                ('height', models.FloatField(default=0)),
                ('points', models.JSONField(blank=True, null=True)),
                ('annotation_type', models.CharField(
                    choices=[
                        ('bounding_box', 'Bounding Box'),
                        ('polygon', 'Polygon'),
                        ('classification', 'Classification'),
                        ('segmentation', 'Segmentation'),
                        ('text_classification', 'Text Classification'),
                    ],
                    default='bounding_box',
                    max_length=30,
                )),
                ('comment', models.CharField(blank=True, default='', max_length=500)),
                ('created_by', models.IntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('image', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='annotations',
                    to='annotations.imagefile',
                )),
            ],
            options={
                'db_table': 'annotations',
                'ordering': ['image', 'created_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='imagefile',
            unique_together={('task_id', 'index')},
        ),
    ]
