package program

import (
	"context"
	"sync"
)

// Program runs a model: it hands each message to the model, one at a time, and runs the commands
// the model asks for.
type Program struct {
	model Model
	msgs  chan Msg
	done  chan struct{}
	once  sync.Once
}

// New returns the program that will run model.
func New(model Model) *Program {
	return &Program{model: model, msgs: make(chan Msg, 256), done: make(chan struct{})}
}

// Send hands msg to the model. It does nothing once the program has ended.
func (p *Program) Send(msg Msg) {
	select {
	case p.msgs <- msg:
	case <-p.done:
	}
}

// Run runs the model until ctx ends or the model asks to quit, and returns the model as it was
// then. It returns ctx's error when ctx ended it.
func (p *Program) Run(ctx context.Context) (Model, error) {
	defer p.once.Do(func() { close(p.done) })
	p.start(p.model.Init())
	for {
		select {
		case <-ctx.Done():
			return p.model, ctx.Err()
		case msg := <-p.msgs:
			switch msg := msg.(type) {
			case QuitMsg:
				return p.model, nil
			case BatchMsg:
				for _, cmd := range msg {
					p.start(cmd)
				}
			default:
				var cmd Cmd
				p.model, cmd = p.model.Update(msg)
				p.start(cmd)
			}
		}
	}
}

// start runs cmd apart from the model and sends its message back.
func (p *Program) start(cmd Cmd) {
	if cmd == nil {
		return
	}
	go func() {
		if msg := cmd(); msg != nil {
			p.Send(msg)
		}
	}()
}
