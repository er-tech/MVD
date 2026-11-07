package greeting

// Greet greets someone by name.
func Greet(name string) Greeting {
	return Greeting{Message: "Hello, " + name + "!"}
}
