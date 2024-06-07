package main

import "os"

type AppNameProvider interface {
	Get() string
}

type EnvironmentAppNameProvider struct{}

func (e *EnvironmentAppNameProvider) Get() string {
	return os.Getenv("APP_NAME")
}
