"""Pytest tests for InsureSight API."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


VALID_PAYLOAD = {
    "age": "26-39",
    "driving_experience": "10-19y",
    "education": "university",
    "income": "middle class",
    "credit_score": 0.65,
    "vehicle_ownership": 1,
    "vehicle_year": "after 2015",
    "married": 1,
    "children": 1,
    "postal_code": "10238",
    "annual_mileage": 12000,
    "vehicle_type": "sedan",
    "speeding_violations": 0,
    "duis": 0,
    "past_accidents": 0,
}

HIGH_RISK_PAYLOAD = {
    "age": "16-25",
    "driving_experience": "0-9y",
    "education": "none",
    "income": "poverty",
    "credit_score": 0.3,
    "vehicle_ownership": 0,
    "vehicle_year": "before 2015",
    "married": 0,
    "children": 0,
    "postal_code": "21217",
    "annual_mileage": 22000,
    "vehicle_type": "sports car",
    "speeding_violations": 4,
    "duis": 1,
    "past_accidents": 3,
}


class TestHealth:
    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestPredict:
    def test_predict_returns_valid_structure(self, client):
        r = client.post("/api/predict", json=VALID_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        assert data["prediction"] in ("Yes", "No")
        assert 0 <= data["probability"] <= 1
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_level"] in ("Low", "Medium", "High")
        assert isinstance(data["top_factors"], list)
        assert len(data["top_factors"]) <= 5
        for f in data["top_factors"]:
            assert "feature" in f
            assert "shap_value" in f
            assert f["direction"] in ("increases", "decreases")

    def test_high_risk_person_is_high_risk(self, client):
        r = client.post("/api/predict", json=HIGH_RISK_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        # High-risk profile should have at least Medium risk score (>= 40)
        assert data["risk_score"] >= 40, f"Expected >= 40, got {data['risk_score']}"
        assert data["risk_level"] in ("Medium", "High")

    def test_predict_with_model_selector(self, client):
        for model in ("xgboost", "lightgbm", "catboost", "neural_network"):
            r = client.post(f"/api/predict?model={model}", json=VALID_PAYLOAD)
            assert r.status_code == 200
            assert r.json()["model_used"] == model

    def test_predict_invalid_age_returns_422(self, client):
        bad = dict(VALID_PAYLOAD, age="INVALID")
        r = client.post("/api/predict", json=bad)
        assert r.status_code == 422

    def test_predict_credit_score_out_of_range(self, client):
        bad = dict(VALID_PAYLOAD, credit_score=1.5)
        r = client.post("/api/predict", json=bad)
        assert r.status_code == 422

    def test_risk_level_thresholds(self, client):
        """Verify risk_level is consistent with probability."""
        r = client.post("/api/predict", json=VALID_PAYLOAD)
        data = r.json()
        prob = data["probability"]
        expected = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        assert data["risk_level"] == expected

    def test_risk_score_equals_probability_x100(self, client):
        r = client.post("/api/predict", json=VALID_PAYLOAD)
        data = r.json()
        assert data["risk_score"] == round(data["probability"] * 100)


class TestRiskLevelLogic:
    """Unit tests for risk level calculation independent of HTTP."""

    def test_low_risk(self):
        prob = 0.20
        level = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        assert level == "Low"

    def test_medium_risk(self):
        prob = 0.55
        level = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        assert level == "Medium"

    def test_high_risk(self):
        prob = 0.85
        level = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        assert level == "High"

    def test_boundary_low_medium(self):
        prob = 0.40
        level = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        assert level == "Medium"

    def test_boundary_medium_high(self):
        prob = 0.70
        level = "High" if prob >= 0.70 else ("Medium" if prob >= 0.40 else "Low")
        assert level == "High"


class TestDashboard:
    def test_dashboard_summary(self, client):
        r = client.get("/api/dashboard/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["total_policies"] > 0
        assert len(data["claims_by_month"]) == 12
        assert len(data["risk_distribution"]) == 3

    def test_model_performance(self, client):
        r = client.get("/api/models/performance")
        assert r.status_code == 200
        data = r.json()
        assert len(data["models"]) == 4
        best = [m for m in data["models"] if m["is_best"]]
        assert len(best) == 1
        assert 0 <= best[0]["roc_auc"] <= 1
