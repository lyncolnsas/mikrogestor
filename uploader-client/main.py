import sys
import time
import logging
import requests
import os
import configparser
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuração de Logs
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

class UploadHandler(FileSystemEventHandler):
    def __init__(self, api_url, api_key, subdomain):
        self.api_url = api_url
        self.api_key = api_key
        self.subdomain = subdomain

    def on_created(self, event):
        if event.is_directory:
            return
        
        file_path = event.src_path
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in ['.jpg', '.jpeg', '.png', '.webp']:
            logging.info(f"Nova foto detectada: {file_path}. Iniciando upload...")
            self.upload_file(file_path)

    def upload_file(self, file_path):
        try:
            url = f"{self.api_url}/api/upload"
            headers = {
                "x-api-key": self.api_key,
                "Host": f"{self.subdomain}.mikrogestor.com.br" # Simula o subdomínio se necessário
            }
            
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f)}
                data = {'type': 'gallery'}
                
                response = requests.post(url, headers=headers, files=files, data=data)
                
                if response.status_code == 200:
                    logging.info(f"✅ Upload concluído com sucesso: {response.json().get('url')}")
                else:
                    logging.error(f"❌ Erro no upload: {response.status_code} - {response.text}")
        except Exception as e:
            logging.error(f"💥 Erro catastrófico: {str(e)}")

def main():
    # Carregar Configurações
    config = configparser.ConfigParser()
    config_file = 'config.conf'
    
    if not os.path.exists(config_file):
        logging.error("Arquivo config.conf não encontrado!")
        return

    config.read(config_file)
    
    try:
        api_url = config['DEFAULT']['API_URL']
        api_key = config['DEFAULT']['API_KEY']
        subdomain = config['DEFAULT']['SUBDOMAIN']
        watch_path = config['DEFAULT']['WATCH_PATH']
    except KeyError as e:
        logging.error(f"Configuração ausente: {e}")
        return

    if not os.path.exists(watch_path):
        os.makedirs(watch_path)
        logging.info(f"Pasta de monitoramento criada: {watch_path}")

    event_handler = UploadHandler(api_url, api_key, subdomain)
    observer = Observer()
    observer.schedule(event_handler, watch_path, recursive=False)
    
    logging.info(f"🚀 Monitorando pasta: {watch_path}")
    logging.info(f"API Target: {api_url} (Tenant: {subdomain})")
    
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
