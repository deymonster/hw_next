package router

import (
	"net/http"

	"github.com/deymonster/li-server/internal/handlers"
	"github.com/deymonster/li-server/internal/services"
)

func New(tokenService *services.TokenService) *http.ServeMux {
	mux := http.NewServeMux()

	activationHandler := handlers.NewActivationHandler(tokenService)
	mux.HandleFunc("/v1/activate", activationHandler.Activate)

	return mux
}
