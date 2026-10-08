# RabbitMQ (AMQP) on port 4620 (TDK bring-your-own range is 4000-5999).
# RabbitMQ's built-in "guest" user only accepts loopback connections, so a
# local-dev user is created for the other containers. Not for production.
FROM rabbitmq:3.13-alpine
ENV RABBITMQ_NODE_PORT=4620 \
    RABBITMQ_DEFAULT_USER=people \
    RABBITMQ_DEFAULT_PASS=people
EXPOSE 4620
