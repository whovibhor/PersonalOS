from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_PATH), extra="ignore")

    app_name: str = "PersonalOS"
    environment: str = "dev"

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "personalos"

    frontend_origin: str = "http://localhost:5173"

    @property
    def sqlalchemy_database_uri(self) -> str:
        # mysql+pymysql://user:pass@host:port/dbname
        user = self.db_user
        password = self.db_password
        host = self.db_host
        port = self.db_port
        name = self.db_name
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"


settings = Settings()
