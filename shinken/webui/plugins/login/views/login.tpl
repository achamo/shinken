%rebase layout title='Shinken UI login', print_menu=False


<script type="text/javascript">
function submitform()
{
document.forms["loginform"].submit();
}

/* Catch the key ENTER and launch the form 
 Will be link in the password field
*/
function submitenter(myfield,e){
  var keycode;
  if (window.event) keycode = window.event.keyCode;
  else if (e) keycode = e.which;
  else return true;


  if (keycode == 13){
    submitform();
    return false;
  }else
   return true;
}

</script>






				<div id="login-container" class="prefix_custom_2">
				<div class="grid_8">
					<img src="/static/images/robot_rouge_alpha.png" alt="Shinken Login">
				</div>
				<div id="login-form" class="grid_7">
					<form method="post" id="loginform" action="/auth">
					
						<div class="text-field">
						  <label for="login">Login:</label>
						  <input name="login" type="text" tabindex="1" size="30">
						</div>
						<div class="text-field">
							<label for="password">Password:</label>
							<input name="password" type="password" tabindex="2" size="30" onKeyPress="return submitenter(this,event)">
					  </div>
						<input type="hidden" value="0" name="remember_me">
					<div class="check-field">
							<input type="checkbox" id="remember_me" tabindex="3" name="remember_me"> <label for="remember_me">Don't forget me</label>
						</div>
						<div class="buttons">
						<a tabindex="4" class="button" href="javascript: submitform()">Login</a>
					</div>
					</form>
				</div>
				</div>
			</div>
			<div class="clear"></div>
			<div id="login_footer" class="grid_16">
				<div class="grid_4 border_right">
					<h3>Additional help</h3> 
					<dl>
					    <dt><a href="http://www.shinken-monitoring.org/wiki/">Wiki</a></dt>
					    <dt><a href="http://www.shinken-monitoring.org/forum/">Forum</a></dt>
					</dl>
				</div>
				<div class="grid_4">
					<h3>Version</h3> 
					<dl>
					    <dt>Shinken</dt>
					    <dd>0.6.5+</dd>
					    <dt>UI</dt>
					    <dd>0.6.5+</dd>
					</dl>
				</div>
			</div>
			<div class="clear"></div>
		</div>
	</body>
</html>
