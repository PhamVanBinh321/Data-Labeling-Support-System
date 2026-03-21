from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Task',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('project_id', models.IntegerField(db_index=True)),
                ('annotator_id', models.IntegerField(db_index=True)),
                ('reviewer_id', models.IntegerField(db_index=True)),
                ('name', models.CharField(max_length=255)),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('pending', 'Pending'),
                        ('in-progress', 'In Progress'),
                        ('in-review', 'In Review'),
                        ('approved', 'Approved'),
                        ('rejected', 'Rejected'),
                        ('completed', 'Completed'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('priority', models.CharField(
                    choices=[('High', 'High'), ('Medium', 'Medium'), ('Low', 'Low')],
                    default='Medium',
                    max_length=10,
                )),
                ('deadline', models.DateField()),
                ('total_images', models.IntegerField(default=0)),
                ('completed_images', models.IntegerField(default=0)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('quality_score', models.FloatField(blank=True, null=True)),
                ('reject_reason', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'tasks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TaskStatusHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_status', models.CharField(blank=True, default='', max_length=20)),
                ('to_status', models.CharField(max_length=20)),
                ('changed_by', models.IntegerField()),
                ('reject_reason', models.TextField(blank=True, default='')),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
                ('task', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='history',
                    to='tasks.task',
                )),
            ],
            options={
                'db_table': 'task_status_history',
                'ordering': ['-changed_at'],
            },
        ),
    ]
