# MongoDB on port 4600: TDK's bring-your-own range is 4000-5999, and the other
# services reach it on the Docker network as mongo:4600.
FROM mongo:7.0
EXPOSE 4600
CMD ["mongod", "--port", "4600", "--bind_ip_all"]
