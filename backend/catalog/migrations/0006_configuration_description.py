from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0005_configuration_cooler_count_configuration_has_rgb'),
    ]

    operations = [
        migrations.AddField(
            model_name='configuration',
            name='description',
            field=models.TextField(blank=True, default='', verbose_name='Назначение сборки'),
        ),
    ]
