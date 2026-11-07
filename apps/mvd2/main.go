package main

import (
	"fmt"

	"github.com/er-tech/MVD/apps/mvd2/greeting"
)

func main() {
	fmt.Println(greeting.Greet("world").Message)
}
