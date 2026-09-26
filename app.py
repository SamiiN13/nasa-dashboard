from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
import requests
import os
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)

NASA_API_KEY = os.getenv("NASA_API_KEY")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/apod")
def apod():
    url = f"https://api.nasa.gov/planetary/apod?api_key={NASA_API_KEY}"
    response = requests.get(url)
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch APOD"})
    return jsonify(response.json())

@app.route("/asteroids")
def asteroids():
    start_date = request.args.get("start_date")
    if not start_date:
        start_date = datetime.today().strftime("%Y-%m-%d")
    end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=7)).strftime("%Y-%m-%d")
    url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={start_date}&end_date={end_date}&api_key={NASA_API_KEY}"
    response = requests.get(url)
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch asteroids"})
    return jsonify(response.json())

if __name__ == "__main__":
    app.run(debug=True)