FROM python:3.12-slim
RUN pip install --no-cache-dir pytest && useradd -m -u 1000 runner
USER runner
WORKDIR /job
