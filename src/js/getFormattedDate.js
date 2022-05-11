export default function getFormattedDate(x) {
   let months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
   let l = new Date(x);
   // return(`${months[l.getMonth()]} ${l.getDate()}, ${l.getFullYear()}`)
   return(`${l.getMonth()+1}/${l.getDate()+1}/${l.getFullYear().toString().slice(2,4)}`)
 }
