package main

import (
	qmq "github.com/rqure/qmq/src"
)

type RuntimeWorker struct {
	db                qmq.IDatabase
	dbConnectionState qmq.ConnectionState_ConnectionStateEnum
}

func NewRuntimeWorker(db qmq.IDatabase) *RuntimeWorker {
	return &RuntimeWorker{
		db:                db,
		dbConnectionState: qmq.ConnectionState_DISCONNECTED,
	}
}

func (w *RuntimeWorker) Init() {

}

func (w *RuntimeWorker) Deinit() {

}

func (w *RuntimeWorker) DoWork() {

}

func (w *RuntimeWorker) OnNewClientMessage(args ...interface{}) {
	// client := args[0].(qmq.IWebClient)
	// msg := args[1].(*qmq.WebMessage)
}
