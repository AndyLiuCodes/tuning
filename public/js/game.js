$(document).ready(function() {
	// Set the initial volume
	$('#audio-playback').prop('volume', 0.1);
	$('#score').html('Score: 0');

	// Should hide this div with css
	$('#result-btns').hide();

	// Get the playlist object from the server
	$.ajax({
		url: '/play/get_playlist',
		method: 'POST',
		dataType: 'JSON',
		success: function(data) {
			gameplay(data, score);
		},
		error: function(err) {
			console.log(err);
		},
	});

	// Functionality of gameplay
	function gameplay(playlist) {
		var num_songs = playlist.length;
		var curr_song = 0;

		// Disable the button so user's don't accidentally submit before song is loaded
		$('.btn').attr('disabled', true);

		// Countdown between next songs, update the song url and what current song the user is on
		// Display the multiple choice answers in the buttons
		countdown_update(playlist[curr_song], curr_song, num_songs);

		// The case where the user doesn't submit any answers before the preview ends
		$('#audio-playback').on('ended', function() {
			chg_btn_color(get_btn_i(playlist[curr_song].songname), 'green');
			// Hide the alert after a 3s
			$('.alert').fadeTo(3000, 500).slideUp(500, function() {
				$('.alert').slideUp(500);
			});

			// Go to the next song in the playlist
			curr_song++;
			next_song(playlist, curr_song, num_songs);
		});

		// A user submits an answer, the answer is marked and the user is alerted accordingly
		$('.btn').click(function() {
			var guess = $(this).html();
			var guess_id = $(this).attr('id').slice(3, 4);
			$('#audio-playback').trigger('pause');

			// Validate the guess against the correct answer using the innerHTML of the buttons
			mark_guess(guess, playlist[curr_song].songname, guess_id);

			// Go to the next song in the playlist
			curr_song++;
			next_song(playlist, curr_song, num_songs);
		});

		// Update the progress bar visually to match the current time of the song
		$('#audio-playback').on('playing', function() {
			percent = 100;
			var progress = setInterval(function() {
				var audio = document.getElementById('audio-playback');
				var duration = audio.duration;
				var curr_time = audio.currentTime;
				percent = (duration - curr_time) / duration * 100;

				$('#progressbar').css('width', percent + '%').attr('aria-valuenow', percent);

				if (curr_time > duration || audio.paused) {
					$('#progressbar').css('width', 100 + '%').attr('aria-valuenow', 100);
					clearInterval(progress);
				}
			}, 100);
		});
	}

	// Displays a countdown timer in between songs
	function countdown_update(song, curr_song, num_songs) {
		// Number of seconds in between songs
		var time2play = 3;
		var countdown = setInterval(function() {
			$('#countdown').fadeIn(500);
			$('#countdown').html(time2play);
			time2play--;

			if (time2play < 0) {
				clearInterval(countdown);
				$('#countdown').html('GO!');
				$('#countdown').delay(1000).fadeOut(500);
				$('#audio-playback').trigger('load');
				$('#audio-playback').trigger('play');
				$('.btn').attr('disabled', false);
				$('#countdown').html('&nbsp;');
				update_song_view(song, curr_song, num_songs);
			}
		}, 1000);
	}

	function shuffle(arr) {
		const len = arr.length;
		var temp;
		var rand_int;
		for (var i = 0; i < len; i++) {
			rand_int = Math.floor(Math.random() * (len - i)) + i;
			temp = arr[i];
			arr[i] = arr[rand_int];
			arr[rand_int] = temp;
		}
		return arr;
	}

	// Updates the song url and current song number
	function update_song_view(song, i, num_songs) {
		$('#song_counter').html(parseFloat(i + 1) + '/' + num_songs);
		$('#song-playback').attr('src', song.url);
		var btn_nums = [ 0, 1, 2, 3 ];
		btn_nums = shuffle(btn_nums);
		var correct_btn = btn_nums.pop();
		$('#btn' + correct_btn).html(song.songname);
		$('#btn' + correct_btn).css('background', '#23272b');
		var id_num;

		for (var i = 0; i < 3; i++) {
			id_num = btn_nums.pop();
			$('#btn' + id_num).html(song.related_songs[i]);
			$('#btn' + id_num).css('background', '#23272b');
		}
	}

	// Load the next song in the playlist
	function next_song(playlist, curr_song, num_songs) {
		// Disable buttons to prevent accidental submissions
		$('.btn').attr('disabled', true);

		// Check if the last song in the playlist has played
		if (is_finished(curr_song, num_songs)) {
			var score = $('#score').html();
			score = parseFloat(score.slice(6, score.length));
			// Show the final score and button to redirect to other pages
			upload_score(score);
			show_results();
			show_playlist(playlist);
		} else {
			// Songs still remaining
			countdown_update(playlist[curr_song], curr_song, num_songs);
		}
	}

	function chg_btn_color(id, color) {
		$('#btn' + id).css('background', color);
	}

	function get_btn_i(song) {
		var val;
		song = song.replace('&#039;', "'");
		for (var i = 0; i < 4; i++) {
			val = $('#btn' + i).html();
			if (val == song) {
				return i;
			}
		}
	}

	// Check if the user has guessed correctly
	function mark_guess(song_guess, correct_song, guess_id) {
		// There are escaped HTML characters in the string for "'"
		correct_song = correct_song.replace('&#039;', "'");

		if (song_guess == correct_song) {
			$('#progressbar').css('width', 100 + '%').attr('aria-valuenow', 100);
			var score = $('#score').html();
			score = parseFloat(score.slice(6, score.length));
			score = score + parseInt(1000 * (percent / 100));
			$('#score').html('Score: ' + score);
		} else {
			chg_btn_color(guess_id, 'red');
		}

		chg_btn_color(get_btn_i(correct_song), 'green');
		// This is hides the alert after a set amount of time
		$('.alert').fadeTo(3000, 500).slideUp(500, function() {
			$('.alert').slideUp(500);
		});
	}

	// Check if its the last song in the playlist
	function is_finished(curr_song, num_songs) {
		return curr_song >= num_songs ? true : false;
	}

	// Hide the input and progress divs and show the redirect buttons
	function show_results() {
		$('#mc_btns').hide();
		$('#progress-box').hide();
		$('#result-btns').show();
		$('#page-title').html('Results').hide().fadeIn(500);
	}

	// Show the playlist after the game is finished
	function show_playlist(playlist) {
		var list = '';
		playlist.forEach(function(song) {
			list += '<li>' + song.songname + '</li>';
		});
		$('#songlist').append(list);
	}

	function upload_score(score) {
		$.ajax({
			url: '/users/upscore',
			method: 'POST',
			data: { userScore: score },
			dataType: 'application/json',
			success: function() {
				console.log('success');
			},
			error: function(err) {
				console.log(err);
			},
		});
	}
});
