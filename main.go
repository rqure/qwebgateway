package main

import (
	qmq "github.com/rqure/qmq/src"
)

type NameProvider struct{}

func (np *NameProvider) Get() string {
	return "logger"
}

type TransformerProviderFactory struct {
	AppNameProvider AppNameProvider
}

func (t *TransformerProviderFactory) Create(components qmq.EngineComponentProvider) qmq.TransformerProvider {
	transformerProvider := qmq.NewDefaultTransformerProvider()
	transformerProvider.Set("consumer:"+t.AppNameProvider.Get()+":logs", []qmq.Transformer{
		qmq.NewMessageToAnyTransformer(components.WithLogger()),
		NewAnyToLogTransformer(components.WithLogger()),
	})
	return transformerProvider
}

func main() {
	appNameProvider := &EnvironmentAppNameProvider{}
	engine := qmq.NewDefaultEngine(qmq.DefaultEngineConfig{
		NameProvider:               &NameProvider{},
		ConsumerFactory:            &ConsumerFactory{},
		TransformerProviderFactory: &TransformerProviderFactory{AppNameProvider: appNameProvider},
		EngineProcessor:            &EngineProcessor{AppNameProvider: appNameProvider},
	})
	engine.Run()
}
