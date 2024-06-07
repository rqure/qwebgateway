package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	qmq "github.com/rqure/qmq/src"
)

type EngineProcessor struct {
	AppNameProvider AppNameProvider
}

func (e *EngineProcessor) Process(cp qmq.EngineComponentProvider) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	key := e.AppNameProvider.Get() + ":logs"

	for {
		select {
		case <-quit:
			return
		case c := <-cp.WithConsumer(key).Pop():
			logMsg := c.Data().(*qmq.Log)

			fmt.Printf("%s | %s | %s | %s\n", logMsg.Timestamp.AsTime().String(), logMsg.Application, logMsg.Level.String(), logMsg.Message)

			c.Ack()
		}
	}
}
