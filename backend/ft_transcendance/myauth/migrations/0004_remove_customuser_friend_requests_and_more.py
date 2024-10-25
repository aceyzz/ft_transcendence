# Generated by Django 5.1.1 on 2024-10-02 17:02

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myauth', '0003_customuser_friend_requests'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='friend_requests',
        ),
        migrations.AddField(
            model_name='customuser',
            name='friend_requests_sent',
            field=models.ManyToManyField(related_name='friend_requests_received', to=settings.AUTH_USER_MODEL),
        ),
    ]