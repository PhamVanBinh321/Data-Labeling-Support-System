from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('type', models.CharField(
                    choices=[
                        ('bounding_box', 'Bounding Box'),
                        ('polygon', 'Polygon'),
                        ('classification', 'Classification'),
                        ('segmentation', 'Segmentation'),
                        ('text_classification', 'Text Classification'),
                    ],
                    max_length=30,
                )),
                ('description', models.TextField(blank=True, default='')),
                ('guidelines', models.TextField(blank=True, default='')),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('active', 'Active'),
                        ('paused', 'Paused'),
                        ('completed', 'Completed'),
                    ],
                    default='draft',
                    max_length=20,
                )),
                ('total_images', models.IntegerField(default=0)),
                ('annotated_images', models.IntegerField(default=0)),
                ('approved_images', models.IntegerField(default=0)),
                ('manager_id', models.IntegerField(db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'projects',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='LabelDefinition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('project', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='labels',
                    to='projects.project',
                )),
                ('name', models.CharField(max_length=100)),
                ('color', models.CharField(max_length=7)),
                ('attributes', models.JSONField(blank=True, default=list)),
            ],
            options={
                'db_table': 'label_definitions',
            },
        ),
        migrations.AddConstraint(
            model_name='labeldefinition',
            constraint=models.UniqueConstraint(
                fields=('project', 'name'),
                name='unique_label_per_project',
            ),
        ),
        migrations.CreateModel(
            name='ProjectMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('project', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='members',
                    to='projects.project',
                )),
                ('user_id', models.IntegerField(db_index=True)),
                ('role', models.CharField(
                    choices=[('annotator', 'Annotator'), ('reviewer', 'Reviewer')],
                    max_length=20,
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('active', 'Active'),
                        ('declined', 'Declined'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('invited_at', models.DateTimeField(auto_now_add=True)),
                ('joined_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'project_members',
            },
        ),
        migrations.AddConstraint(
            model_name='projectmember',
            constraint=models.UniqueConstraint(
                fields=('project', 'user_id'),
                name='unique_member_per_project',
            ),
        ),
        migrations.CreateModel(
            name='Dataset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('project', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='datasets',
                    to='projects.project',
                )),
                ('name', models.CharField(max_length=255)),
                ('type', models.CharField(
                    choices=[('image', 'Image'), ('video', 'Video'), ('text', 'Text')],
                    default='image',
                    max_length=20,
                )),
                ('status', models.CharField(
                    choices=[
                        ('imported', 'Imported'),
                        ('processing', 'Processing'),
                        ('ready', 'Ready'),
                        ('error', 'Error'),
                    ],
                    default='imported',
                    max_length=20,
                )),
                ('total_files', models.IntegerField(default=0)),
                ('total_size_mb', models.FloatField(default=0.0)),
                ('source', models.CharField(
                    choices=[
                        ('local', 'Local Upload'),
                        ('s3', 'AWS S3'),
                        ('azure', 'Azure Blob'),
                        ('gcs', 'Google Cloud Storage'),
                    ],
                    default='local',
                    max_length=20,
                )),
                ('uploaded_by', models.IntegerField()),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'datasets',
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
