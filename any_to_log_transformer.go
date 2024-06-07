package main

import (
	"fmt"

	qmq "github.com/rqure/qmq/src"
	"google.golang.org/protobuf/types/known/anypb"
)

type AnyToLogTransformer struct {
	logger qmq.Logger
}

func NewAnyToLogTransformer(logger qmq.Logger) qmq.Transformer {
	return &AnyToLogTransformer{
		logger: logger,
	}
}

func (t *AnyToLogTransformer) Transform(i interface{}) interface{} {
	d, ok := i.(*anypb.Any)
	if !ok {
		t.logger.Error(fmt.Sprintf("AnyToLogTransformer: invalid input %T", i))
		return nil
	}

	a := &qmq.Log{}
	err := d.UnmarshalTo(a)
	if err != nil {
		t.logger.Error(fmt.Sprintf("AnyToLogTransformer: failed to unmarshal into log: %v", err))
		return nil
	}

	return a
}
