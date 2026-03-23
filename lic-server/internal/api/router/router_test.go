package router_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/deymonster/lic-server/internal/api/router"
	"github.com/deymonster/lic-server/internal/core/license"
)

func TestHandleRegister_Validation(t *testing.T) {
	// Setup (mock service is nil for now, we only test validation before service call)
	svc := &license.Service{}
	r := router.NewRouter(svc, "test-admin-key")

	tests := []struct {
		name       string
		body       interface{}
		wantStatus int
	}{
		{
			name:       "Empty Body",
			body:       nil,
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "Missing Fields",
			body: router.RegisterRequest{
				INN: "",
				CSR: "",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "Missing CSR",
			body: router.RegisterRequest{
				INN: "1234567890",
				CSR: "",
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var bodyBytes []byte
			if tt.body != nil {
				bodyBytes, _ = json.Marshal(tt.body)
			}

			req := httptest.NewRequest("POST", "/v1/register", bytes.NewBuffer(bodyBytes))
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					w.Code, tt.wantStatus)
			}
		})
	}
}
