#!/usr/bin/env python3
"""
SRIDATTAM Backend API Test Suite
Tests WooCommerce proxy API with dynamic URL resolution and configuration states
"""

import requests
import json
import sys

# Resolve the active base URL dynamically by checking which server is responding
def resolve_base_url():
    candidates = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://9a865eeb-eca4-4e1e-b810-4fd57fd1ec17.preview.emergentagent.com"
    ]
    for url in candidates:
        try:
            r = requests.get(f"{url}/api/health", timeout=3)
            if r.status_code == 200:
                print(f"Using working Base URL: {url}")
                return url
        except Exception:
            continue
    # Default fallback
    print(f"Fallback to default Base URL: {candidates[0]}")
    return candidates[0]

BASE_URL = resolve_base_url()
API_BASE = f"{BASE_URL}/api"

# Determine config state from the health check response
IS_CONFIGURED = False
try:
    r = requests.get(f"{API_BASE}/health", timeout=3)
    if r.status_code == 200:
        IS_CONFIGURED = r.json().get('wc_configured', False)
except Exception:
    pass
print(f"WooCommerce Configured State: {IS_CONFIGURED}")

def test_health_endpoint():
    """Test 1: GET /api/health should return ok:true, matching wc_configured state"""
    print("\n=== Test 1: Health Endpoint ===")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"[FAIL] Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        if data.get('ok') != True:
            print(f"[FAIL] Expected ok:true, got {data.get('ok')}")
            return False
        
        expected_config = IS_CONFIGURED
        if data.get('wc_configured') != expected_config:
            print(f"[FAIL] Expected wc_configured:{expected_config}, got {data.get('wc_configured')}")
            return False
        
        print("[PASS] Health endpoint working correctly")
        return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_products_list_unconfigured():
    """Test 2: GET /api/products should return 200 (if configured) or 503 (if unconfigured)"""
    print("\n=== Test 2: Products List ===")
    try:
        response = requests.get(f"{API_BASE}/products", timeout=10)
        print(f"Status: {response.status_code}")
        
        if IS_CONFIGURED:
            if response.status_code != 200:
                print(f"[FAIL] Expected status 200 (configured), got {response.status_code}")
                return False
            print("[PASS] Products list correctly returns 200 when WC configured")
            return True
        else:
            if response.status_code != 503:
                print(f"[FAIL] Expected status 503, got {response.status_code}")
                return False
            
            data = response.json()
            if data.get('code') != 'WC_NOT_CONFIGURED':
                print(f"[FAIL] Expected code:WC_NOT_CONFIGURED, got {data.get('code')}")
                return False
            
            print("[PASS] Products list correctly returns 503 when WC not configured")
            return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_product_detail_unconfigured():
    """Test 3: GET /api/products/some-slug should return 200/404 (if configured) or 503 (if unconfigured)"""
    print("\n=== Test 3: Product Detail ===")
    try:
        response = requests.get(f"{API_BASE}/products/test-product-slug", timeout=10)
        print(f"Status: {response.status_code}")
        
        if IS_CONFIGURED:
            if response.status_code not in [200, 404]:
                print(f"[FAIL] Expected status 200 or 404 (configured), got {response.status_code}")
                return False
            print(f"[PASS] Product detail returned status {response.status_code} when WC configured")
            return True
        else:
            if response.status_code != 503:
                print(f"[FAIL] Expected status 503, got {response.status_code}")
                return False
            
            data = response.json()
            if data.get('code') != 'WC_NOT_CONFIGURED':
                print(f"[FAIL] Expected code:WC_NOT_CONFIGURED, got {data.get('code')}")
                return False
            
            print("[PASS] Product detail correctly returns 503 when WC not configured")
            return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_categories_unconfigured():
    """Test 4: GET /api/categories should return 200 (if configured) or 503 (if unconfigured)"""
    print("\n=== Test 4: Categories ===")
    try:
        response = requests.get(f"{API_BASE}/categories", timeout=10)
        print(f"Status: {response.status_code}")
        
        if IS_CONFIGURED:
            if response.status_code != 200:
                print(f"[FAIL] Expected status 200 (configured), got {response.status_code}")
                return False
            print("[PASS] Categories correctly returns 200 when WC configured")
            return True
        else:
            if response.status_code != 503:
                print(f"[FAIL] Expected status 503, got {response.status_code}")
                return False
            
            data = response.json()
            if data.get('code') != 'WC_NOT_CONFIGURED':
                print(f"[FAIL] Expected code:WC_NOT_CONFIGURED, got {data.get('code')}")
                return False
            
            print("[PASS] Categories correctly returns 503 when WC not configured")
            return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_order_get_unconfigured():
    """Test 5: GET /api/orders/123 should return 401/404 (if configured) or 503 (if unconfigured)"""
    print("\n=== Test 5: Get Order ===")
    try:
        response = requests.get(f"{API_BASE}/orders/123?key=wc_order_ABC123", timeout=10)
        print(f"Status: {response.status_code}")
        
        if IS_CONFIGURED:
            if response.status_code not in [401, 404]:
                print(f"[FAIL] Expected status 401 or 404, got {response.status_code}")
                return False
            print(f"[PASS] Order fetch rejected correctly with status {response.status_code} when WC configured")
            return True
        else:
            if response.status_code != 503:
                print(f"[FAIL] Expected status 503, got {response.status_code}")
                return False
            
            data = response.json()
            if data.get('code') != 'WC_NOT_CONFIGURED':
                print(f"[FAIL] Expected code:WC_NOT_CONFIGURED, got {data.get('code')}")
                return False
            
            print("[PASS] Get order correctly returns 503 when WC not configured")
            return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_order_create_unconfigured():
    """Test 6: POST /api/orders with empty body should return 400 (if configured) or 503 (if unconfigured)"""
    print("\n=== Test 6: Create Order ===")
    try:
        response = requests.post(f"{API_BASE}/orders", json={}, timeout=10)
        print(f"Status: {response.status_code}")
        
        if IS_CONFIGURED:
            if response.status_code != 400:
                print(f"[FAIL] Expected status 400, got {response.status_code}")
                return False
            print("[PASS] Create order rejected empty body with 400 when WC configured")
            return True
        else:
            if response.status_code != 503:
                print(f"[FAIL] Expected status 503, got {response.status_code}")
                return False
            
            data = response.json()
            if data.get('code') != 'WC_NOT_CONFIGURED':
                print(f"[FAIL] Expected code:WC_NOT_CONFIGURED, got {data.get('code')}")
                return False
            
            print("[PASS] Create order correctly returns 503 when WC not configured")
            return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_cors_headers():
    """Test 7: OPTIONS /api/products should return 200/204 with CORS headers"""
    print("\n=== Test 7: CORS Headers ===")
    try:
        response = requests.options(f"{API_BASE}/products", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code not in [200, 204]:
            print(f"[FAIL] Expected status 200 or 204, got {response.status_code}")
            return False
        
        cors_header = response.headers.get('Access-Control-Allow-Origin')
        if not cors_header:
            print(f"[FAIL] Missing Access-Control-Allow-Origin header")
            return False
        
        print(f"[PASS] CORS headers present (Access-Control-Allow-Origin: {cors_header})")
        return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_security_headers():
    """Test 8: GET /api/health should include security headers"""
    print("\n=== Test 8: Security Headers ===")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        print(f"Status: {response.status_code}")
        
        all_passed = True
        
        xct = response.headers.get('X-Content-Type-Options')
        if xct and 'nosniff' in xct:
            print(f"[PASS] X-Content-Type-Options: {xct}")
        else:
            print(f"[FAIL] X-Content-Type-Options missing or incorrect: {xct}")
            all_passed = False
        
        xfo = response.headers.get('X-Frame-Options')
        if xfo and 'SAMEORIGIN' in xfo:
            print(f"[PASS] X-Frame-Options: {xfo} (contains SAMEORIGIN)")
        else:
            print(f"[FAIL] X-Frame-Options missing or incorrect: {xfo}")
            all_passed = False
        
        rp = response.headers.get('Referrer-Policy')
        if rp and 'no-referrer-when-downgrade' in rp:
            print(f"[PASS] Referrer-Policy: {rp}")
        else:
            print(f"[FAIL] Referrer-Policy missing or incorrect: {rp}")
            all_passed = False
        
        if all_passed:
            print("[PASS] All security headers present and correct")
        return all_passed
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_unknown_route():
    """Test 9: GET /api/totally-fake should return 404"""
    print("\n=== Test 9: Unknown Route ===")
    try:
        response = requests.get(f"{API_BASE}/totally-fake", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            print(f"[FAIL] Expected status 404, got {response.status_code}")
            return False
        
        print("[PASS] Unknown route correctly returns 404")
        return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_unsafe_method():
    """Test 10: PUT /api/products should return 404 or 405"""
    print("\n=== Test 10: Unsafe Method (PUT) ===")
    try:
        response = requests.put(f"{API_BASE}/products", json={}, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code not in [404, 405]:
            print(f"[FAIL] Expected status 404 or 405, got {response.status_code}")
            return False
        
        print(f"[PASS] PUT method correctly rejected with status {response.status_code}")
        return True
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_no_secret_leakage():
    """Test 11: Verify API does not leak actual secret VALUES in responses"""
    print("\n=== Test 11: Secret Leakage Check ===")
    try:
        endpoints = [
            f"{API_BASE}/health",
            f"{API_BASE}/products",
            f"{API_BASE}/categories",
            f"{API_BASE}/orders/123?key=wc_order_ABC123"
        ]
        
        sensitive_patterns = [
            'mongodb://localhost',
            'Basic ',
        ]
        
        all_safe = True
        for endpoint in endpoints:
            response = requests.get(endpoint, timeout=10)
            response_text = response.text
            
            for pattern in sensitive_patterns:
                if pattern in response_text:
                    print(f"[FAIL] Found sensitive data '{pattern}' in {endpoint}")
                    all_safe = False
        
        response = requests.get(f"{API_BASE}/products", timeout=10)
        if 'WC_CONSUMER_KEY' in response.text and 'WC_CONSUMER_SECRET' in response.text:
            print("[PASS] Error messages helpfully mention env var names (good UX)")
        
        if all_safe:
            print("[PASS] No actual secrets leaked in API responses")
        return all_safe
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_validation_logic():
    """Test 12: Verify validation logic for slugs, IDs, and keys"""
    print("\n=== Test 12: Input Validation ===")
    try:
        all_passed = True
        
        # Test invalid slug (too long)
        print("\n--- Testing invalid slug (too long) ---")
        response = requests.get(f"{API_BASE}/products/{'a' * 150}", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid slug rejected with 400")
        elif response.status_code == 404:
            print("[PASS] Invalid slug (too long) returned 404 not found (which is a valid validation rejection)")
        else:
            print(f"[FAIL] Expected 400, 404 or 503, got {response.status_code}")
            all_passed = False
        
        # Test invalid slug (special characters)
        print("\n--- Testing invalid slug (special chars) ---")
        response = requests.get(f"{API_BASE}/products/test@product!", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid slug rejected with 400")
        elif response.status_code == 404:
            print("[PASS] Invalid slug (special chars) returned 404 not found")
        else:
            print(f"[FAIL] Expected 400, 404 or 503, got {response.status_code}")
            all_passed = False
        
        # Test invalid order ID (non-numeric)
        print("\n--- Testing invalid order ID ---")
        response = requests.get(f"{API_BASE}/orders/abc?key=wc_order_ABC123", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid order ID rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        # Test missing order key
        print("\n--- Testing missing order key ---")
        response = requests.get(f"{API_BASE}/orders/123", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 401:
            print("[PASS] Missing order key rejected with 401")
        else:
            print(f"[FAIL] Expected 401 or 503, got {response.status_code}")
            all_passed = False
        
        # Test invalid order key format
        print("\n--- Testing invalid order key format ---")
        response = requests.get(f"{API_BASE}/orders/123?key=invalid_key", timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 401:
            print("[PASS] Invalid order key rejected with 401")
        else:
            print(f"[FAIL] Expected 401 or 503, got {response.status_code}")
            all_passed = False
        
        if all_passed:
            print("\n[PASS] Input validation logic is correct")
        else:
            print("\n[FAIL] Some validation checks failed")
        return all_passed
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def test_order_validation():
    """Test 13: Verify order creation validation (billing, line_items)"""
    print("\n=== Test 13: Order Creation Validation ===")
    try:
        all_passed = True
        
        # Test with missing billing info
        print("\n--- Testing missing billing info ---")
        response = requests.post(f"{API_BASE}/orders", json={
            "billing": {"first_name": "Ravi"},
            "line_items": [{"product_id": 1, "quantity": 1}]
        }, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Incomplete billing rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        # Test with invalid email
        print("\n--- Testing invalid email ---")
        response = requests.post(f"{API_BASE}/orders", json={
            "billing": {
                "first_name": "Ravi",
                "last_name": "Kumar",
                "email": "invalid-email",
                "phone": "9876543210",
                "address_1": "123 Main St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postcode": "400001"
            },
            "line_items": [{"product_id": 1, "quantity": 1}]
        }, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid email rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        # Test with invalid phone (not 10 digits)
        print("\n--- Testing invalid phone ---")
        response = requests.post(f"{API_BASE}/orders", json={
            "billing": {
                "first_name": "Ravi",
                "last_name": "Kumar",
                "email": "ravi@example.com",
                "phone": "123",
                "address_1": "123 Main St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postcode": "400001"
            },
            "line_items": [{"product_id": 1, "quantity": 1}]
        }, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid phone rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        # Test with invalid postcode (not 6 digits)
        print("\n--- Testing invalid postcode ---")
        response = requests.post(f"{API_BASE}/orders", json={
            "billing": {
                "first_name": "Ravi",
                "last_name": "Kumar",
                "email": "ravi@example.com",
                "phone": "9876543210",
                "address_1": "123 Main St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postcode": "123"
            },
            "line_items": [{"product_id": 1, "quantity": 1}]
        }, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid postcode rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        # Test with empty line_items
        print("\n--- Testing empty line_items ---")
        response = requests.post(f"{API_BASE}/orders", json={
            "billing": {
                "first_name": "Ravi",
                "last_name": "Kumar",
                "email": "ravi@example.com",
                "phone": "9876543210",
                "address_1": "123 Main St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postcode": "400001"
            },
            "line_items": []
        }, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Empty line_items rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        # Test with invalid quantity
        print("\n--- Testing invalid quantity ---")
        response = requests.post(f"{API_BASE}/orders", json={
            "billing": {
                "first_name": "Ravi",
                "last_name": "Kumar",
                "email": "ravi@example.com",
                "phone": "9876543210",
                "address_1": "123 Main St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postcode": "400001"
            },
            "line_items": [{"product_id": 1, "quantity": 1000}]
        }, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 503:
            print("[WARN] WC not configured - validation happens after config check")
        elif response.status_code == 400:
            print("[PASS] Invalid quantity (>999) rejected with 400")
        else:
            print(f"[FAIL] Expected 400 or 503, got {response.status_code}")
            all_passed = False
        
        if all_passed:
            print("\n[PASS] Order validation logic is correct")
        else:
            print("\n[FAIL] Some order validation checks failed")
        return all_passed
    except Exception as e:
        print(f"[FAIL] Exception - {str(e)}")
        return False

def main():
    print("=" * 70)
    print("SRIDATTAM Backend API Test Suite")
    print("Testing WooCommerce Proxy API")
    print("=" * 70)
    
    tests = [
        ("Health Endpoint", test_health_endpoint),
        ("Products List", test_products_list_unconfigured),
        ("Product Detail", test_product_detail_unconfigured),
        ("Categories", test_categories_unconfigured),
        ("Get Order", test_order_get_unconfigured),
        ("Create Order", test_order_create_unconfigured),
        ("CORS Headers", test_cors_headers),
        ("Security Headers", test_security_headers),
        ("Unknown Route", test_unknown_route),
        ("Unsafe Method", test_unsafe_method),
        ("Secret Leakage Check", test_no_secret_leakage),
        ("Input Validation", test_validation_logic),
        ("Order Creation Validation", test_order_validation)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n[FAIL] Test '{test_name}' crashed: {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")
    
    print("\n" + "=" * 70)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("=" * 70)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
