from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class StockPrice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(10), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    price = db.Column(db.Float, nullable=False)
