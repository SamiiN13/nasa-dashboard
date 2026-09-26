from flask import Flask, jsonify, render_template
from dotenv import load_dotenv
import requests
import os

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
    data = response.json()
    return jsonify(data)

@app.route("/asteroids")
def asteroids():
    url = f"https://api.nasa.gov/neo/rest/v1/feed?api_key={NASA_API_KEY}"
    response = requests.get(url)
    data = response.json()
    return jsonify(data)

@app.route("/mars")
def mars():
    return jsonify({"message": "Mars photos coming soon"})

if __name__ == "__main__":
    app.run(debug=True)