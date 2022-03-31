import pkg from 'gh-pages';
const {ghpages} = pkg;

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/jaredwhalen/mwy-farewell-tracker.git', // Update to point to your repository
        user: {
            name: 'Jared Whalen', // update to use your name
            email: 'jared.m.whalen@gmail.com' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)
