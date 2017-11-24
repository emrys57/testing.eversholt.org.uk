<?php

// Object-oriented session handler from http://php.net/manual/en/function.session-start.php

class Session
{
  const SESSION_STARTED = TRUE;
  const SESSION_NOT_STARTED = FALSE;

  private $sessionState = self::SESSION_NOT_STARTED; // The state of the session

  private static $instance; // THE only instance of the class

  private function __construct() {}

    // Returns THE instance of 'Session'.
    // The session is automatically initialized if it wasn't.
    // @return    object
    public static function getInstance() {
      if ( !isset(self::$instance)) {
        self::$instance = new self;
      }
      self::$instance->startSession();
      return self::$instance;
    }

    // (Re)starts the session.
    //@return    bool    TRUE if the session has been initialized, else FALSE.
    public function startSession() {
      if ( $this->sessionState == self::SESSION_NOT_STARTED ) {
        $this->sessionState = session_start();
      }
      return $this->sessionState;
    }

    // Stores datas in the session.
    // Example: $instance->foo = 'bar';
    // @param    name    Name of the datas.
    // @param    value    Your datas.
    // @return    void
    public function __set( $name , $value ) {
      // echo("Setting _SESSION $name to $value.<br />");
      $_SESSION[$name] = $value;
    }


    //    Gets datas from the session.
    //    Example: echo $instance->foo;
    //
    //    @param    name    Name of the datas to get.
    //    @return    mixed    Datas stored in session.
    public function __get( $name ) {
      // echo("Getting _SESSION $name.<br />");
      if ( isset($_SESSION[$name])) {
        // $value = $_SESSION[$name];
        // echo("Getting _SESSION $name, was $value.<br />");
        return $_SESSION[$name];
      }
    }

    public function __isset( $name ) {
      return isset($_SESSION[$name]);
    }

    public function __unset( $name ) {
      unset( $_SESSION[$name] );
    }

    //    Destroys the current session.
    //
    //    @return    bool    TRUE is session has been deleted, else FALSE.
    public function destroy()   {
      if ( $this->sessionState == self::SESSION_STARTED ) {
        $this->sessionState = !session_destroy();
        unset( $_SESSION );
        return !$this->sessionState;
      }
      return FALSE;
    }
  }


 ?>
