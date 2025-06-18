from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

@app.route('/api/stocks/<symbol>')
def get_stock(symbol):
    try:

        end = datetime.today()

        if (request.args.get('time', '1 Month') == "1 Month"):
            start = end - timedelta(days = 30)
        if (request.args.get('time', '3 Months') == "3 Months"):
            start = end - timedelta(days = 90)
        if (request.args.get('time', '6 Months') == "6 Months"):
            start = end - timedelta(days = 180)
        if (request.args.get('time', '1 Year') == "1 Year"):
            start = end - timedelta(days = 365)
        if (request.args.get('time', '3 Years') == "3 Years"):
            start = end - timedelta(days= 3 * 365)
        if (request.args.get('time', '5 Years') == "5 Years"):
            start = end - timedelta(days = 5 * 365)

        df = yf.download(symbol, start=start.strftime('%Y-%m-%d'), end=end.strftime('%Y-%m-%d'))

        if df.empty:
            return jsonify([])

        # Convert DataFrame rows into JSON-serializable format
        result = [
            {
                "date": idx.strftime('%Y-%m-%d'),
                "Price": round(float(row["Close"]), 2)  # Convert numpy.float to Python float
            }
            for idx, row in df.iterrows()
        ]

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
