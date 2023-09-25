FROM python:3

RUN git config --global user.email "daemon@artx.market"
RUN git config --global user.name "ArtX Market"
RUN git config --global --add safe.directory /app/data

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN git clone https://github.com/macterra/py-ipfs-http-client.git
RUN cd py-ipfs-http-client && FLIT_ROOT_INSTALL=1 flit install --pth-file
COPY *.py .

CMD [ "python", "-u", "./archiver.py" ]
