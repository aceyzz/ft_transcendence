# Generated by Django 5.1.1 on 2024-10-04 16:37

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0002_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='WebSocketConnection',
        ),
    ]
