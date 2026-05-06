{{/*
Generate the full name for resources.
*/}}
{{- define "spotify-converter.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "spotify-converter.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{/*
Backend selector labels — used in Deployment and Service matchLabels.
*/}}
{{- define "spotify-converter.backend.selectorLabels" -}}
app: {{ include "spotify-converter.fullname" . }}-backend
{{- end }}

{{/*
Frontend selector labels — used in Deployment and Service matchLabels.
*/}}
{{- define "spotify-converter.frontend.selectorLabels" -}}
app: {{ include "spotify-converter.fullname" . }}-frontend
{{- end }}
