FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    libonig-dev \
    libpq-dev \
    libxml2-dev \
    libzip-dev \
    unzip \
    && docker-php-ext-install mbstring pdo_pgsql xml zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]