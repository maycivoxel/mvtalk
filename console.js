async function about() {
  const repo = 'maycivoxel/mvtalk';

  let commitText = 'Unable to retrieve latest commit.';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/commits?per_page=1`
    );

    if (!response.ok) {
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }

    const commits = await response.json();
    const commit = commits[0];

    if (commit) {
      const date = new Date(commit.commit.author.date);

      commitText =
        `${date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })} at ${date.toLocaleTimeString('en-US')}`;
    }
  } catch (err) {
    console.warn('[MVTalk] Could not retrieve latest GitHub commit:', err);
  }

  console.log(
`MVTalk by mayci_voxel (cairode)
This utility is licensed under the MIT Licence.
Its related audio data is provided under CC0 (Creative Commons 0/Public Domain)

Last commit to repository on ${commitText}`
  );
}

function _2kyfn() {
  const now = new Date();

  const future = new Date(now);
  future.setFullYear(future.getFullYear() + 2000);

  const date = future.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  console.log(
`2'000 years from ${date}...

Humanity is no more.
The robots have finally won.
Beep boop!`
  );
}

function screech() {
  const text =
    'SKREEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE';

  console.log(text);
  
}

function gay() {
  const flag = [
    ['████████████████████████████', '#E40303'],
    ['████████████████████████████', '#FF8C00'],
    ['████████████████████████████', '#FFED00'],
    ['████████████████████████████', '#008026'],
    ['████████████████████████████', '#004DFF'],
    ['████████████████████████████', '#750787']
  ];

  for (const [row, color] of flag) {
    console.log(`%c${row}`, `
      color: ${color};
      font-weight: bold;
      font-size: 16px;
      line-height: 16px;
    `);
  }

  console.log('%cTaste the rainbow, MOTHERFUCKER!!!', `
    font-weight: bold;
    font-size: 18px;
  `);

}

function nyo() {
  const art = String.raw`         ._                __.
        / \"-.          ,-",'/
       (   \ ,"--.__.--".,' /
       =---Y(_i.-'  |-.i_)---=
      f ,  "..'/\\v/|/|/\  , l
      l//  ,'|/   V / /||  \\j
       "--; / db     db|/---"
          | \ YY   , YY//
          '.\>_   (_),"' __
        .-"    "-.-." I,"  \`.
        \.-""-. ( , ) ( \   |
        (     l  \`"'  -'-._j
 __,---_ '._." .  .    \
(__.--_-'.  ,  :  '  \  '-.
    ,' .'  /   |   \  \  \ "-
     "--.._____t____.--'-""'
            /  /  \`. ".
           / ":     \\' '.
         .'  (       \   :
         |    l      j    "-.
         l_;_;I      l____;_I

                      cgmm`;

  console.log(art);
  console.log('Dejiko-chan? Is that you?');
}

/* Make the functions explicitly available from the browser console. */
window.about = about;
window._2kyfn = _2kyfn;
window.screech = screech;
window.gay = gay;
window.nyo = nyo;

console.log('[MVTalk] Console functions loaded.');
console.log('Available commands: about(), _2kyfn(), screech(), gay(), nyo()');
