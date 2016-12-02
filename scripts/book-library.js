function startApp() {
   sessionStorage.clear(); // Clear user auth data
   showHideMenuLinks();
   showView('viewHome');
   $("#linkHome").click(showHomeView);
   $("#linkLogin").click(showLoginView);
   $("#linkRegister").click(showRegisterView);
   $("#linkListBooks").click(listBooks);
   $("#linkCreateBook").click(showCreateBookView);
   $("#linkLogout").click(logoutUser);
   $("#formLogin").submit(loginUser);
   $("#formRegister").submit(registerUser);
   $("#buttonCreateBook").click(createBook);
   $("#buttonEditBook").click(editBook);
   $("form").submit(function(e) { e.preventDefault() });
   $("#infoBox, #errorBox").click(function() {
      $(this).fadeOut();
   });
   $(document).on({
      ajaxStart: function() { $("#loadingBox").show() },
      ajaxStop: function() { $("#loadingBox").hide() }
   });
   function showHideMenuLinks() {
      $("#linkHome").show();
      if (sessionStorage.getItem('authToken')) {
         // We have logged in user
         $("#linkLogin").hide();
         $("#linkRegister").hide();
         $("#linkListBooks").show();
         $("#linkCreateBook").show();
         $("#linkLogout").show();
      } else {
         // No logged in user
         $("#linkLogin").show();
         $("#linkRegister").show();
         $("#linkListBooks").hide();
         $("#linkCreateBook").hide();
         $("#linkLogout").hide();
      }
   }
   function showView(viewName) {
      // Hide all views and show the selected view only
      $('main > section').hide();
      $('#' + viewName).show();
   }
   function showHomeView() {
      showView('viewHome');
   }
   function showLoginView() {
      showView('viewLogin');
      $('#formLogin').trigger('reset');
   }
   function showRegisterView() {
      $('#formRegister').trigger('reset');
      showView('viewRegister');
   }
   function showCreateBookView() {
      $('#formCreateBook').trigger('reset');
      showView('viewCreateBook');
   }
   const kinveyBaseUrl = "https://baas.kinvey.com/";
   const kinveyAppKey = "kid_S1wvVrFr";
   const kinveyAppSecret =
       "66cd316a52be4ab5b733cc67e9667658";
   const kinveyAppAuthHeaders = {
      'Authorization': "Basic " +
      btoa(kinveyAppKey + ":" + kinveyAppSecret),
   };
   function registerUser() {
      let userData = {
         username: $('#formRegister input[name=username]').val(),
         password: $('#formRegister input[name=passwd]').val()
      };
      $.ajax({
         method: "POST",
         url: kinveyBaseUrl + "user/" + kinveyAppKey + "/",
         headers: kinveyAppAuthHeaders,
         data: userData,
         success: registerSuccess,
         error: handleAjaxError
      });

      function registerSuccess(userInfo) {
         saveAuthInSession(userInfo);
         showHideMenuLinks();
         listBooks();
         showInfo('User registration successful.');
      }
   }
   function saveAuthInSession(userInfo) {
      let userAuth = userInfo._kmd.authtoken;
      sessionStorage.setItem('authToken', userAuth);
      let userId = userInfo._id;
      sessionStorage.setItem('userId', userId);
      let username = userInfo.username;
      $('#loggedInUser').text(
          "Welcome, " + username + "!");
   }
   function handleAjaxError(response) {
      let errorMsg = JSON.stringify(response);
      if (response.readyState === 0)
         errorMsg = "Cannot connect due to network error.";
      if (response.responseJSON &&
          response.responseJSON.description)
         errorMsg = response.responseJSON.description;
      showError(errorMsg);
   }
   function showInfo(message) {
      $('#infoBox').text(message);
      $('#infoBox').show();
      setTimeout(function() {
         $('#infoBox').fadeOut();
      }, 3000);
   }
   function showError(errorMsg) {
      $('#errorBox').text("Error: " + errorMsg);
      $('#errorBox').show();
   }
   function loginUser() {
      let userData = {
         username: $('#formLogin input[name=username]').val(),
         password: $('#formLogin input[name=passwd]').val()
      };
      $.ajax({
         method: "POST",
         url: kinveyBaseUrl + "user/" + kinveyAppKey + "/login",
         headers: kinveyAppAuthHeaders,
         data: userData,
         success: loginSuccess,
         error: handleAjaxError
      });
      function loginSuccess(userInfo) {
         saveAuthInSession(userInfo);
         showHideMenuLinks();
         listBooks();
         showInfo('Login successful.');
      }
   }
   function logoutUser() {
      sessionStorage.clear();
      $('#loggedInUser').text("");
      showHideMenuLinks();
      showView('viewHome');
      showInfo('Logout successful.');
   }
   function listBooks() {
      $('#books').empty();
      showView('viewBooks');
      $.ajax({
         method: "GET",
         url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/Books",
         headers: getKinveyUserAuthHeaders(),
         success: loadBooksSuccess,
         error: handleAjaxError
      });
      function loadBooksSuccess(books) {
         showInfo('Books loaded.');
         if (books.length == 0) {
            $('#books').text('No books in the library.');
         } else {
            let booksTable = $('<table>')
                .append($('<tr>').append(
                    '<th>Title</th><th>Author</th>',
                    '<th>Description</th><th>Actions</th>'));
            for (let book of books)
               appendBookRow(book, booksTable);
            $('#books').append(booksTable);
         }
      }
      function appendBookRow(book, booksTable) {
         let links = [];
         if (book._acl.creator == sessionStorage['userId']) {
            let deleteLink = $('<a href="#">[Delete]</a>')
                .click(function () { deleteBook(book) });
            let editLink = $('<a href="#">[Edit]</a>')
                .click(function () { loadBookForEdit(book) });
            links = [deleteLink, ' ', editLink];
         }

         booksTable.append($('<tr>').append(
             $('<td>').text(book.Title),
             $('<td>').text(book.Author),
             $('<td>').text(book.Description),
             $('<td>').append(links)
         ));
      }

   }
   function getKinveyUserAuthHeaders() {
      return {
         'Authorization': "Kinvey " +
         sessionStorage.getItem('authToken'),
      };
   }
   function createBook() {
      let bookData = {
         Title: $('#formCreateBook input[name=title]').val(),
         Author: $('#formCreateBook input[name=author]').val(),
         Description: $('#formCreateBook textarea[name=descr]').val()
      };
      $.ajax({
         method: "POST",
         url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/Books",
         headers: getKinveyUserAuthHeaders(),
         data: bookData,
         success: createBookSuccess,
         error: handleAjaxError
      });
      function createBookSuccess(response) {
         listBooks();
         showInfo('Book created.');
      }
   }
   function deleteBook(book) {
      $.ajax({
         method: "DELETE",
         url: kinveyBookUrl = kinveyBaseUrl + "appdata/" +
             kinveyAppKey + "/Books/" + book._id,
         headers: getKinveyUserAuthHeaders(),
         success: deleteBookSuccess,
         error: handleAjaxError
      });
      function deleteBookSuccess(response) {
         listBooks();
         showInfo('Book deleted.');
      }
   }
   function loadBookForEdit(book) {
      $.ajax({
         method: "GET",
         url: kinveyBookUrl = kinveyBaseUrl + "appdata/" +
             kinveyAppKey + "/Books/" + book._id,
         headers: getKinveyUserAuthHeaders(),
         success: loadBookForEditSuccess,
         error: handleAjaxError
      });
      function loadBookForEditSuccess(book) {
         $('#formEditBook input[name=id]').val(book._id);
         $('#formEditBook input[name=title]').val(book.Title);
         $('#formEditBook input[name=author]')
             .val(book.Author);
         $('#formEditBook textarea[name=descr]')
             .val(book.Description);
         showView('viewEditBook');
      }
   }
   function editBook() {
      let bookData = {
         Title: $('#formEditBook input[name=title]').val(),
         Author: $('#formEditBook input[name=author]').val(),
         Description:
             $('#formEditBook textarea[name=descr]').val()
      };
      $.ajax({
         method: "PUT",
         url: kinveyBaseUrl + "appdata/" + kinveyAppKey +
         "/Books/" + $('#formEditBook input[name=id]').val(),
         headers: getKinveyUserAuthHeaders(),
         data: bookData,
         success: editBookSuccess,
         error: handleAjaxError
      });

      function editBookSuccess(response) {
         listBooks();
         showInfo('Book edited.');
      }
   }

}
