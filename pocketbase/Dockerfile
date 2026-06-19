FROM alpine:3.20

ARG PB_VERSION=0.39.4

RUN apk add --no-cache ca-certificates unzip

WORKDIR /pb

# Download the PocketBase release binary
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb && rm /tmp/pb.zip

# Version-controlled schema + server-side hooks (applied automatically on boot)
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY entrypoint.sh /pb/entrypoint.sh

RUN chmod +x /pb/entrypoint.sh /pb/pocketbase

EXPOSE 8080

ENTRYPOINT ["/pb/entrypoint.sh"]
