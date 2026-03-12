package embedded

import _ "embed"

//go:embed ca.crt
var CACert []byte
