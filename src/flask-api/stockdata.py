from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
from openai import OpenAI
from datetime import datetime, timedelta
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
CORS(app)


# AI PROMPT PART OF THE FILE ------------------------------------------------

# load your API key securely (env var recommended)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route("/explain", methods=["POST"])
def explain_investment():
    data = request.json
    ticker1 = data["ticker1"]
    ticker2 = data["ticker2"]
    amount = data["amount"]
    profit1 = data["profit1"]
    profit2 = data["profit2"]
    start = data["start"]
    end = data["end"]

    prompt = f"""
    You are a friendly financial advisor summarizing a user's hypothetical stock investments.

    The user invested ${amount} in {ticker1} and ${amount} in {ticker2} between {start} and {end}.
    Their returns were {profit1}% for {ticker1} and {profit2}% for {ticker2}. Also give the amounts.

    Compare both investments in plain, conversational language.
    Avoid using equations or markdown formatting — no bullet points, no headers.
    Just explain clearly which performed better, why, and what that means for an everyday investor.
    Also, include one short paragraph about possible market factors that might explain the difference.
    Finally, end with a short reflection on whether investing ${amount} monthly toward that total would make sense financially.
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    explanation = response.choices[0].message.content
    return jsonify({"explanation": explanation})


# STOCK DATA INFO -----------------------------------------------

# # PostgreSQL connection
# conn = psycopg2.connect(
#     dbname="financial_dashboard",
#     user="postgres",
#     password="Thekey100!",
#     host="localhost",  # or your cloud host
#     port="5432"
# )
# cur = conn.cursor()

# stock data route

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

# GET balance from Clerk id route

# @app.route('/api/balance/<user_id>', methods=['GET'])
# def get_balance(user_id):
#     cur.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
#     result = cur.fetchone()
#     if result:
#         return jsonify({"balance": float(result[0])})
#     else:
#         return jsonify({"balance": 0})

# POST (update) balance for user

# @app.route('/api/balance', methods=['POST'])
# def update_balance():
#     data = request.json
#     user_id = data.get('user_id')
#     balance = data.get('balance')

#     if not user_id or balance is None:
#         return jsonify({"error": "Missing user_id or balance"}), 400

#     cur.execute("""
#         INSERT INTO users (id, balance)
#         VALUES (%s, %s)
#         ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance
#     """, (user_id, balance))
#     conn.commit()

#     return jsonify({"message": "Balance updated."})



# run
if __name__ == '__main__':
    app.run(debug=True, threaded=True)
