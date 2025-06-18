from flask import Flask, jsonify
from flask_cors import CORS
from models import db, StockPrice
import yfinance as yf
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
db.init_app(app)

# Helper to fetch and store if not already in DB
def fetch_and_store_stock(ticker):
    exists = StockPrice.query.filter_by(ticker=ticker.upper()).first()
    if exists:
        return

    try:
        data = yf.Ticker(ticker).history(period='5y')
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return

    for date, row in data.iterrows():
        db.session.add(StockPrice(
            ticker=ticker.upper(),
            timestamp=date,
            price=row["Close"]
        ))
    db.session.commit()

@app.route('/api/stocks/<ticker>')
def get_stock(ticker):
    fetch_and_store_stock(ticker)
    prices = StockPrice.query.filter_by(ticker=ticker.upper()).order_by(StockPrice.timestamp.asc()).all()

    if not prices:
        return jsonify({'error': 'No data found'}), 404

    price_list = [
        {"time": p.timestamp.strftime("%Y-%m-%d"), "price": p.price}
        for p in prices
    ]

    start_price = prices[0].price
    end_price = prices[-1].price
    initial_investment = 1000
    final_value = initial_investment * (end_price / start_price)
    profit = final_value - initial_investment

    return jsonify({
        "data": price_list,
        "start_price": start_price,
        "end_price": end_price,
        "investment": initial_investment,
        "final_value": round(final_value, 2),
        "profit": round(profit, 2)
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
