# Build the application from source
FROM golang:1.21.6 AS build-stage

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
COPY web/ ./web/

RUN CGO_ENABLED=0 GOOS=linux go build -o /qapp

# Deploy the application binary into a lean image
FROM gcr.io/distroless/base-debian11 AS build-release-stage

WORKDIR /

COPY --from=build-stage /qapp /qapp
COPY --from=build-stage /app/web/ /web/

USER nonroot:nonroot

ENTRYPOINT ["/qapp"]
