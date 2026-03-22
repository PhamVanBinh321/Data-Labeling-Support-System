from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recipient_id', models.IntegerField(db_index=True)),
                ('type', models.CharField(
                    choices=[
                        ('task_assigned', 'Task Assigned'),
                        ('task_submitted', 'Task Submitted'),
                        ('task_approved', 'Task Approved'),
                        ('task_rejected', 'Task Rejected'),
                        ('member_invited', 'Member Invited'),
                        ('system', 'System'),
                    ],
                    max_length=30,
                )),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('task_id', models.IntegerField(blank=True, null=True)),
                ('project_id', models.IntegerField(blank=True, null=True)),
                ('is_read', models.BooleanField(db_index=True, default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient_id', 'is_read'], name='notif_recipient_read_idx'),
        ),
    ]
