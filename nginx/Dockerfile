FROM nginx:1.26-alpine

# paquets necessaires
RUN apk add --no-cache \
    bash \
    git \
    gcc \
    g++ \
    make \
    libtool \
    autoconf \
    automake \
    curl \
    linux-headers \
    pcre-dev \
    zlib-dev \
    libstdc++ \
    lmdb-dev \
    yajl-dev \
    geoip-dev \
    curl-dev \
    openssl-dev \
    libxml2-dev \
    libxslt-dev

# modsecurity
RUN git clone --recursive https://github.com/owasp-modsecurity/ModSecurity /opt/ModSecurity \
    && cd /opt/ModSecurity \
    && ./build.sh \
    && ./configure \
    && make \
    && make install

# connecteur modsecurity <-> nginx
RUN git clone --recursive https://github.com/owasp-modsecurity/ModSecurity-nginx /opt/ModSecurity-nginx

# telecharger et compiler nginx avec modsecurity
RUN curl -O https://nginx.org/download/nginx-1.26.2.tar.gz \
    && tar zxvf nginx-1.26.2.tar.gz \
    && cd nginx-1.26.2 \
    && ./configure --with-compat --add-dynamic-module=/opt/ModSecurity-nginx \
    && make modules \
    && cp objs/ngx_http_modsecurity_module.so /etc/nginx/modules/

# regles de config modsecurity
RUN mkdir -p /etc/nginx/modsec/coreruleset
RUN git clone https://github.com/coreruleset/coreruleset.git /etc/nginx/modsec/coreruleset
RUN mv /etc/nginx/modsec/coreruleset/crs-setup.conf.example /etc/nginx/modsec/coreruleset/crs-setup.conf
RUN chmod 644 /etc/nginx/modsec/coreruleset/crs-setup.conf

# fichiers config nginx + modsecurity
COPY modsecurity/modsecurity.conf /etc/nginx/modsec/modsecurity.conf
COPY config/nginx.conf /etc/nginx/nginx.conf