import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Share,
  Alert,
  BackHandler,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BOOKS, VERSIONS, loadBook } from './bibleData';

const STORAGE_VERSION = '@bible_version';
const STORAGE_LAST_READ = '@bible_last_read';
const STORAGE_FONT = '@bible_font_size';
const STORAGE_NOTES = '@bible_notes';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ALIASES = {
  gn: 1, dt: 5, mt: 40, mk: 41, lk: 42, jn: 43,
  '1jn': 62, '2jn': 63, '3jn': 64, ps: 19, prov: 20,
};

const MAX_RESULTS = 100;

export default function BibleScreen({ navigation }) {
  const [versionKey, setVersionKey] = useState('KJV');
  const [filter, setFilter] = useState('All'); // All | Old | New
  const [query, setQuery] = useState('');
  const [view, setView] = useState('books'); // books | chapters | reader | results
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [chapterVerses, setChapterVerses] = useState([]);
  const [highlight, setHighlight] = useState([]); // verse numbers galing sa search
  const [selectedVerses, setSelectedVerses] = useState([]); // na-tap ng user
  const [fontSize, setFontSize] = useState(17);
  const [results, setResults] = useState([]);
  const [resultsLabel, setResultsLabel] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastRead, setLastRead] = useState(null);
  const [gotoChapter, setGotoChapter] = useState('');
  const [gotoVerse, setGotoVerse] = useState('');
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  const scrollRef = useRef(null);
  const verseY = useRef({});
  const bookCache = useRef({ KJV: {}, TAGALOG: {} });

  const bookName = useCallback(
    (book, vKey = versionKey) => (vKey === 'TAGALOG' ? book.tagalog : book.name),
    [versionKey]
  );

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_VERSION);
        if (v && VERSIONS[v]) setVersionKey(v);
        const f = await AsyncStorage.getItem(STORAGE_FONT);
        if (f) setFontSize(parseInt(f, 10) || 17);
        const lr = await AsyncStorage.getItem(STORAGE_LAST_READ);
        if (lr) setLastRead(JSON.parse(lr));
        const nt = await AsyncStorage.getItem(STORAGE_NOTES);
        if (nt) setNotes(JSON.parse(nt));
      } catch (e) {
        console.log('Bible settings load error', e);
      }
    })();
  }, []);

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.log('Bible settings save error', e);
    }
  };

  const getBookData = (vKey, bookId) => {
    const cache = bookCache.current[vKey];
    if (!cache[bookId]) {
      cache[bookId] = loadBook(vKey, bookId);
    }
    return cache[bookId];
  };

  const openChapter = (book, chapter, opts = {}) => {
    const { verses = [], version = versionKey } = opts;
    try {
      const data = getBookData(version, book.id);
      const chapterData = data[chapter - 1];
      if (!chapterData) {
        Alert.alert('Not Found', `${bookName(book, version)} has no chapter ${chapter}.`);
        return;
      }
      verseY.current = {};
      setSelectedBook(book);
      setSelectedChapter(chapter);
      setChapterVerses(chapterData);
      setHighlight(verses);
      setSelectedVerses([]);
      setNoteOpen(false);
      setView('reader');
      Keyboard.dismiss();

      const lr = { bookId: book.id, chapter };
      setLastRead(lr);
      saveSetting(STORAGE_LAST_READ, lr);

      // Mag-scroll sa verse (kung galing sa search) o sa taas
      setTimeout(() => {
        if (verses.length > 0 && verseY.current[verses[0]] != null) {
          scrollRef.current?.scrollTo({ y: Math.max(verseY.current[verses[0]] - 90, 0), animated: true });
        } else {
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        }
      }, 150);
    } catch (e) {
      console.log('open chapter error', e);
      Alert.alert('Error', 'Hindi mabuksan ang chapter na ito.');
    }
  };

  const openBook = (book) => {
    setSelectedBook(book);
    setGotoChapter('');
    setGotoVerse('');
    setView('chapters');
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Go to chapter / verse sa loob ng kasalukuyang libro
  const handleGoto = () => {
    if (!selectedBook) return;
    const ch = gotoChapter.trim() ? parseInt(gotoChapter, 10) : view === 'reader' ? selectedChapter : NaN;
    const vs = gotoVerse.trim() ? parseInt(gotoVerse, 10) : null;

    if (!ch || ch < 1) {
      Alert.alert('Go to', 'Mag-type ng chapter number.');
      return;
    }
    if (ch > selectedBook.chapters) {
      Alert.alert('Not Found', `${bookName(selectedBook)} has only ${selectedBook.chapters} chapters.`);
      return;
    }
    let verses = [];
    if (vs != null) {
      const data = getBookData(versionKey, selectedBook.id);
      const maxVerse = (data[ch - 1] || []).length;
      if (!vs || vs < 1 || vs > maxVerse) {
        Alert.alert('Not Found', `${bookName(selectedBook)} ${ch} has only ${maxVerse} verses.`);
        return;
      }
      verses = [vs];
    }
    openChapter(selectedBook, ch, { verses });
    setGotoChapter('');
    setGotoVerse('');
  };

  // ---------- NOTES ----------
  const persistNotes = (list) => {
    setNotes(list);
    saveSetting(STORAGE_NOTES, list);
  };

  const refLabel = (bookId, chapter, verses, vKey = versionKey) => {
    const b = BOOKS.find(x => x.id === bookId);
    const name = b ? bookName(b, vKey) : '';
    if (!verses || verses.length === 0) return `${name} ${chapter}`;
    const first = verses[0];
    const last = verses[verses.length - 1];
    return `${name} ${chapter}:${first === last ? first : `${first}-${last}`}`;
  };

  const addNote = () => {
    const text = noteText.trim();
    if (!text) {
      Alert.alert('Notes', 'Mag-type muna ng note.');
      return;
    }
    if (!selectedBook) return;
    const note = {
      id: String(Date.now()),
      bookId: selectedBook.id,
      chapter: selectedChapter,
      verses: selectedVerses,
      text,
      createdAt: Date.now(),
    };
    persistNotes([note, ...notes]);
    setNoteText('');
    setNoteOpen(false);
    Keyboard.dismiss();
  };

  const deleteNote = (id) => {
    Alert.alert('Delete note', 'Burahin ang note na ito?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persistNotes(notes.filter(n => n.id !== id)) },
    ]);
  };

  const openNote = (n) => {
    const b = BOOKS.find(x => x.id === n.bookId);
    if (b) openChapter(b, n.chapter, { verses: n.verses || [] });
  };

  const goToAdjacentChapter = (direction) => {
    if (!selectedBook) return;
    let bookIdx = BOOKS.findIndex(b => b.id === selectedBook.id);
    let chapter = selectedChapter + direction;

    if (chapter < 1) {
      if (bookIdx === 0) return;
      bookIdx -= 1;
      chapter = BOOKS[bookIdx].chapters;
    } else if (chapter > selectedBook.chapters) {
      if (bookIdx === BOOKS.length - 1) return;
      bookIdx += 1;
      chapter = 1;
    }
    openChapter(BOOKS[bookIdx], chapter);
  };

  const stepBack = useCallback(() => {
    if (view === 'reader') {
      setView('chapters');
      return true;
    }
    if (view === 'chapters' || view === 'results' || view === 'notes') {
      setView('books');
      return true;
    }
    if (navigation && navigation.goBack) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [view, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'books') return false; // hayaan ang navigation
      return stepBack();
    });
    return () => sub.remove();
  }, [view, stepBack]);

  const switchVersion = (key) => {
    if (key === versionKey) return;
    setVersionKey(key);
    saveSetting(STORAGE_VERSION, key);
    if (view === 'reader' && selectedBook) {
      try {
        const data = getBookData(key, selectedBook.id);
        setChapterVerses(data[selectedChapter - 1] || []);
        setSelectedVerses([]);
      } catch (e) {
        console.log('switch version error', e);
      }
    }
    if (view === 'results') {
      setView('books');
      setResults([]);
    }
  };

  const changeFont = (delta) => {
    const next = Math.min(28, Math.max(12, fontSize + delta));
    setFontSize(next);
    saveSetting(STORAGE_FONT, String(next));
  };

  const toggleVerse = (num) => {
    setSelectedVerses(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const shareSelection = async () => {
    if (!selectedBook) return;
    const nums = selectedVerses.length > 0
      ? selectedVerses
      : chapterVerses.map((_, i) => i + 1);

    const name = bookName(selectedBook);
    const versionShort = versionKey === 'TAGALOG' ? 'Ang Biblia 1905' : 'KJV';
    const body = nums.map(n => `${n}. ${chapterVerses[n - 1]}`).join('\n');
    const ref = selectedVerses.length > 0
      ? `${name} ${selectedChapter}:${nums.length === 1 ? nums[0] : `${nums[0]}-${nums[nums.length - 1]}`}`
      : `${name} ${selectedChapter}`;

    try {
      await Share.share({ message: `${ref} (${versionShort})\n\n${body}` });
    } catch (e) {
      Alert.alert('Error', 'Hindi ma-share ang verse.');
    }
  };

  const findBookCandidates = (text) => {
    const n = norm(text);
    if (!n) return [];
    if (ALIASES[n]) return [BOOKS.find(b => b.id === ALIASES[n])];
    const exact = BOOKS.filter(b => norm(b.name) === n || norm(b.tagalog) === n);
    if (exact.length > 0) return exact;
    return BOOKS.filter(b => norm(b.name).startsWith(n) || norm(b.tagalog).startsWith(n));
  };

  const runTextSearch = (text) => {
    const needle = text.trim().toLowerCase();
    if (needle.length < 3) {
      Alert.alert('Search', 'Mag-type ng at least 3 letters para sa verse search.');
      return;
    }
    setSearching(true);
    Keyboard.dismiss();

    setTimeout(() => {
      try {
        const found = [];
        outer: for (const book of BOOKS) {
          const data = getBookData(versionKey, book.id);
          for (let c = 0; c < data.length; c++) {
            for (let v = 0; v < data[c].length; v++) {
              if (data[c][v].toLowerCase().includes(needle)) {
                found.push({ book, chapter: c + 1, verse: v + 1, text: data[c][v] });
                if (found.length >= MAX_RESULTS) break outer;
              }
            }
          }
        }
        setResults(found);
        setResultsLabel(
          found.length >= MAX_RESULTS
            ? `First ${MAX_RESULTS} results for "${text.trim()}"`
            : `${found.length} result${found.length === 1 ? '' : 's'} for "${text.trim()}"`
        );
        setView('results');
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      } catch (e) {
        console.log('search error', e);
        Alert.alert('Error', 'Hindi natuloy ang search.');
      }
      setSearching(false);
    }, 50);
  };

  const handleSearch = () => {
    const q = query.trim();
    if (!q) {
      setView('books');
      return;
    }

    const m = q.match(/^((?:[123]\s*)?[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.\-\s]*?)\s*(?:(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?)?$/);
    if (m) {
      const candidates = findBookCandidates(m[1]);
      const chapter = m[2] ? parseInt(m[2], 10) : null;
      const verseStart = m[3] ? parseInt(m[3], 10) : null;
      const verseEnd = m[4] ? parseInt(m[4], 10) : verseStart;

      if (candidates.length > 0) {
        const book = candidates[0];
        if (chapter == null) {
          if (candidates.length === 1) {
            openBook(book);
          } else {
            setView('books');
          }
          return;
        }
        if (chapter < 1 || chapter > book.chapters) {
          Alert.alert('Not Found', `${bookName(book)} has only ${book.chapters} chapters.`);
          return;
        }
        let verses = [];
        if (verseStart != null) {
          const data = getBookData(versionKey, book.id);
          const maxVerse = (data[chapter - 1] || []).length;
          if (verseStart < 1 || verseStart > maxVerse) {
            Alert.alert('Not Found', `${bookName(book)} ${chapter} has only ${maxVerse} verses.`);
            return;
          }
          const end = Math.min(Math.max(verseEnd || verseStart, verseStart), maxVerse);
          for (let v = verseStart; v <= end; v++) verses.push(v);
        }
        openChapter(book, chapter, { verses });
        return;
      }
    }

    runTextSearch(q);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setView('books');
    Keyboard.dismiss();
  };

  const nq = norm(query);
  const filteredBooks = BOOKS.filter(b => {
    if (filter === 'Old' && b.testament !== 'Old') return false;
    if (filter === 'New' && b.testament !== 'New') return false;
    if (!nq) return true;
    return norm(b.name).includes(nq) || norm(b.tagalog).includes(nq);
  });

  const lastReadBook = lastRead ? BOOKS.find(b => b.id === lastRead.bookId) : null;
  const chapterNotes = selectedBook
    ? notes.filter(n => n.bookId === selectedBook.id && n.chapter === selectedChapter)
    : [];

  const headerTitle =
    view === 'reader' && selectedBook
      ? `${bookName(selectedBook)} ${selectedChapter}`
      : view === 'chapters' && selectedBook
      ? bookName(selectedBook)
      : view === 'results'
      ? 'Search Results'
      : view === 'notes'
      ? 'My Notes'
      : 'Holy Bible 📖';

  // Go to chapter / verse bar (ginagamit sa chapters at reader view)
  const renderGoto = () => (
    <View style={styles.gotoRow}>
      <Text style={styles.gotoLabel}>Go to</Text>
      <TextInput
        style={styles.gotoInput}
        placeholder="Chapter"
        placeholderTextColor="#64748B"
        value={gotoChapter}
        onChangeText={(t) => setGotoChapter(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="go"
        onSubmitEditing={handleGoto}
      />
      <Text style={styles.gotoColon}>:</Text>
      <TextInput
        style={styles.gotoInput}
        placeholder="Verse"
        placeholderTextColor="#64748B"
        value={gotoVerse}
        onChangeText={(t) => setGotoVerse(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="go"
        onSubmitEditing={handleGoto}
      />
      <TouchableOpacity style={styles.gotoBtn} onPress={handleGoto}>
        <Text style={styles.gotoBtnText}>Go</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={stepBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Version toggle: English / Tagalog */}
        <View style={styles.versionToggle}>
          {Object.keys(VERSIONS).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.versionBtn, versionKey === key && styles.versionBtnActive]}
              onPress={() => switchVersion(key)}
            >
              <Text style={[styles.versionBtnText, versionKey === key && styles.versionBtnTextActive]}>
                {VERSIONS[key].short}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>{headerTitle}</Text>
        <Text style={styles.versionLabel}>{VERSIONS[versionKey].label}</Text>

        {/* Search Bar (nasa books/results view) */}
        {(view === 'books' || view === 'results') && (
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search (e.g. Matthew 6:33, Matt, or a word)"
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                if (view === 'results') setView('books');
              }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {searching && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#60A5FA" />
            <Text style={styles.loadingText}>Searching all verses...</Text>
          </View>
        )}

        {/* ================= BOOKS VIEW ================= */}
        {view === 'books' && (
          <>
            {/* My Notes */}
            <TouchableOpacity style={styles.myNotesCard} onPress={() => setView('notes')}>
              <Text style={styles.myNotesText}>📝 My Notes ({notes.length})</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
              {[
                { key: 'All', label: 'All (66)' },
                { key: 'Old', label: 'Old (39)' },
                { key: 'New', label: 'New (27)' },
              ].map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.filterText, filter === f.key && styles.filterActiveText]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Continue reading */}
            {lastReadBook && !query && (
              <TouchableOpacity
                style={styles.continueCard}
                onPress={() => openChapter(lastReadBook, lastRead.chapter)}
              >
                <View>
                  <Text style={styles.continueLabel}>CONTINUE READING</Text>
                  <Text style={styles.continueTitle}>
                    {bookName(lastReadBook)} {lastRead.chapter}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Search verses containing the typed word */}
            {query.trim().length >= 3 && (
              <TouchableOpacity style={styles.textSearchBtn} onPress={() => runTextSearch(query)}>
                <Text style={styles.textSearchBtnText}>🔎 Search verses containing "{query.trim()}"</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>
              Books List ({filteredBooks.length})
            </Text>

            {filteredBooks.length === 0 ? (
              <Text style={styles.emptyText}>No book found.</Text>
            ) : (
              filteredBooks.map((item) => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => openBook(item)}>
                  <View>
                    <Text style={styles.cardTitle}>{bookName(item)}</Text>
                    <Text style={styles.cardSub}>
                      {item.testament === 'Old' ? 'Old Testament' : 'New Testament'} • {item.chapters} Chapters
                    </Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* ================= CHAPTERS VIEW ================= */}
        {view === 'chapters' && selectedBook && (
          <>
            {renderGoto()}
            <Text style={styles.sectionTitle}>
              {selectedBook.testament === 'Old' ? 'Old Testament' : 'New Testament'} • {selectedBook.chapters} Chapters
            </Text>
            <View style={styles.chapterGrid}>
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={styles.chapterBtn}
                  onPress={() => openChapter(selectedBook, ch)}
                >
                  <Text style={styles.chapterBtnText}>{ch}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ================= NOTES VIEW ================= */}
        {view === 'notes' && (
          <>
            <Text style={styles.sectionTitle}>My Notes ({notes.length})</Text>
            {notes.length === 0 ? (
              <Text style={styles.emptyText}>
                Wala pang notes. Buksan ang isang kabanata at pindutin ang "Take Notes".
              </Text>
            ) : (
              notes.map(n => (
                <View key={n.id} style={styles.noteCard}>
                  <TouchableOpacity onPress={() => openNote(n)}>
                    <Text style={styles.noteRef}>{refLabel(n.bookId, n.chapter, n.verses)}</Text>
                    <Text style={styles.noteBody}>{n.text}</Text>
                    <Text style={styles.noteDate}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.noteDelete} onPress={() => deleteNote(n.id)}>
                    <Text style={styles.noteDeleteText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* ================= RESULTS VIEW ================= */}
        {view === 'results' && (
          <>
            <Text style={styles.sectionTitle}>{resultsLabel}</Text>
            {results.length === 0 ? (
              <Text style={styles.emptyText}>No verses found.</Text>
            ) : (
              results.map((r, idx) => (
                <TouchableOpacity
                  key={`${r.book.id}-${r.chapter}-${r.verse}-${idx}`}
                  style={styles.resultCard}
                  onPress={() => openChapter(r.book, r.chapter, { verses: [r.verse] })}
                >
                  <Text style={styles.resultRef}>
                    {bookName(r.book)} {r.chapter}:{r.verse}
                  </Text>
                  <Text style={styles.resultText}>{r.text}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* ================= READER VIEW ================= */}
        {view === 'reader' && selectedBook && (
          <>
            {/* Toolbar */}
            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolBtn} onPress={() => changeFont(-1)}>
                <Text style={styles.toolBtnText}>A−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => changeFont(1)}>
                <Text style={styles.toolBtnText}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => setView('chapters')}>
                <Text style={styles.toolBtnText}>📑 Chapters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolBtn, styles.shareBtn]} onPress={shareSelection}>
                <Text style={styles.toolBtnText}>
                  📤 {selectedVerses.length > 0 ? `Share (${selectedVerses.length})` : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>

            {renderGoto()}

            {/* Take Notes */}
            <TouchableOpacity style={styles.noteToggleBtn} onPress={() => setNoteOpen(o => !o)}>
              <Text style={styles.noteToggleText}>
                📝 {noteOpen ? 'Close Notes' : 'Take Notes'}
                {chapterNotes.length > 0 ? ` (${chapterNotes.length})` : ''}
              </Text>
            </TouchableOpacity>

            {noteOpen && (
              <View style={styles.noteBox}>
                <Text style={styles.noteRef}>
                  Note for {refLabel(selectedBook.id, selectedChapter, selectedVerses)}
                </Text>
                {selectedVerses.length === 0 && (
                  <Text style={styles.noteHint}>Tip: i-tap ang mga talata para i-attach ang note sa kanila.</Text>
                )}
                <TextInput
                  style={styles.noteInput}
                  placeholder="Isulat ang note mo dito..."
                  placeholderTextColor="#64748B"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    style={[styles.noteActionBtn, styles.noteCancelBtn]}
                    onPress={() => { setNoteOpen(false); Keyboard.dismiss(); }}
                  >
                    <Text style={styles.noteActionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.noteActionBtn, styles.noteSaveBtn]} onPress={addNote}>
                    <Text style={styles.noteActionText}>Save Note</Text>
                  </TouchableOpacity>
                </View>

                {chapterNotes.length > 0 && (
                  <Text style={styles.noteListTitle}>Notes sa kabanatang ito</Text>
                )}
                {chapterNotes.map(n => (
                  <View key={n.id} style={styles.noteItem}>
                    <Text style={styles.noteRef}>{refLabel(n.bookId, n.chapter, n.verses)}</Text>
                    <Text style={styles.noteBody}>{n.text}</Text>
                    <TouchableOpacity onPress={() => deleteNote(n.id)}>
                      <Text style={styles.noteDeleteText}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {selectedVerses.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedVerses([])}>
                <Text style={styles.clearSelectionText}>✕ Clear selected verses</Text>
              </TouchableOpacity>
            )}

            {chapterVerses.map((text, i) => {
              const num = i + 1;
              const isHighlighted = highlight.includes(num);
              const isSelected = selectedVerses.includes(num);
              return (
                <TouchableOpacity
                  key={num}
                  activeOpacity={0.7}
                  onPress={() => toggleVerse(num)}
                  onLayout={(e) => { verseY.current[num] = e.nativeEvent.layout.y; }}
                  style={[
                    styles.verseRow,
                    isHighlighted && styles.verseHighlight,
                    isSelected && styles.verseSelected,
                  ]}
                >
                  <Text style={[styles.verseText, { fontSize, lineHeight: fontSize * 1.5 }]}>
                    <Text style={styles.verseNum}>{num}  </Text>
                    {text}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Prev / Next chapter */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navBtn, selectedBook.id === 1 && selectedChapter === 1 && styles.navBtnDisabled]}
                disabled={selectedBook.id === 1 && selectedChapter === 1}
                onPress={() => goToAdjacentChapter(-1)}
              >
                <Text style={styles.navBtnText}>‹ Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  selectedBook.id === 66 && selectedChapter === selectedBook.chapters && styles.navBtnDisabled,
                ]}
                disabled={selectedBook.id === 66 && selectedChapter === selectedBook.chapters}
                onPress={() => goToAdjacentChapter(1)}
              >
                <Text style={styles.navBtnText}>Next ›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backText: { color: '#60A5FA', fontSize: 16, fontWeight: 'bold' },
  versionToggle: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 8, borderWidth: 1, borderColor: '#334155', padding: 2 },
  versionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  versionBtnActive: { backgroundColor: '#2563EB' },
  versionBtnText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 13 },
  versionBtnTextActive: { color: '#FFF' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  screenTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 6 },
  versionLabel: { color: '#64748B', fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 2 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 8, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#FFF', paddingHorizontal: 10, fontSize: 14 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  clearBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold' },
  searchBtn: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, justifyContent: 'center' },
  searchBtnText: { color: '#FFF', fontWeight: 'bold' },

  gotoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 8, padding: 6, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  gotoLabel: { color: '#94A3B8', fontWeight: 'bold', fontSize: 13, marginHorizontal: 8 },
  gotoInput: { flex: 1, color: '#FFF', backgroundColor: '#0F172A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: '#334155' },
  gotoColon: { color: '#94A3B8', fontSize: 18, fontWeight: 'bold', marginHorizontal: 6 },
  gotoBtn: { backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, marginLeft: 8 },
  gotoBtnText: { color: '#FFF', fontWeight: 'bold' },

  myNotesCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B' },
  myNotesText: { color: '#FCD34D', fontSize: 16, fontWeight: 'bold' },

  noteToggleBtn: { backgroundColor: '#B45309', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  noteToggleText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  noteBox: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  noteHint: { color: '#94A3B8', fontSize: 12, marginBottom: 8 },
  noteInput: { minHeight: 90, color: '#FFF', backgroundColor: '#0F172A', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  noteActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  noteActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  noteCancelBtn: { backgroundColor: '#334155' },
  noteSaveBtn: { backgroundColor: '#0D9488' },
  noteActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  noteListTitle: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginTop: 14, marginBottom: 6 },
  noteItem: { backgroundColor: '#0F172A', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#334155' },
  noteCard: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  noteRef: { color: '#FCD34D', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  noteBody: { color: '#E2E8F0', fontSize: 14, lineHeight: 20 },
  noteDate: { color: '#64748B', fontSize: 11, marginTop: 6 },
  noteDelete: { marginTop: 8, alignSelf: 'flex-start' },
  noteDeleteText: { color: '#F87171', fontSize: 12, fontWeight: 'bold', marginTop: 6 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13 },

  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterChip: { flex: 1, backgroundColor: '#1E293B', paddingVertical: 8, alignItems: 'center', borderRadius: 6, marginHorizontal: 4, borderWidth: 1, borderColor: '#334155' },
  filterActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  filterActiveText: { color: '#FFF' },

  continueCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#064E3B', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#059669' },
  continueLabel: { color: '#6EE7B7', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  continueTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', marginTop: 2 },

  textSearchBtn: { backgroundColor: '#334155', padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  textSearchBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 30 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  arrow: { color: '#94A3B8', fontSize: 20, fontWeight: 'bold' },

  chapterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chapterBtn: { width: 56, height: 48, backgroundColor: '#1E293B', borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  chapterBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  resultCard: { backgroundColor: '#1E293B', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  resultRef: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  resultText: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },

  toolbar: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  toolBtn: { flex: 1, backgroundColor: '#1E293B', paddingVertical: 9, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  shareBtn: { backgroundColor: '#0D9488', borderColor: '#0D9488', flex: 1.5 },
  toolBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  clearSelectionText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },

  verseRow: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  verseHighlight: { backgroundColor: '#713F12' },
  verseSelected: { backgroundColor: '#1E3A8A' },
  verseText: { color: '#E2E8F0' },
  verseNum: { color: '#60A5FA', fontWeight: 'bold', fontSize: 12 },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navBtn: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  navBtnDisabled: { backgroundColor: '#334155', opacity: 0.5 },
  navBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});