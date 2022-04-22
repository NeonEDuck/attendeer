import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Check login
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const users = collection(firestore, 'users');
        const userDoc = doc(users, user.uid);
        const userSnapshot = await getDoc(userDoc);

        let data = {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
        };

        if (!userSnapshot.exists()) {
            await setDoc(userDoc, data);
        }
        else {
            // 先檢查是否有改變，再上傳資料
            //?不知道更新流量比較需要注意還是獲取流量才比較需要注意
            const {name, photo} = userSnapshot.data();
            if (data.name !== name || data.photo !== photo) {
                await updateDoc(userDoc, data);
            }
        }
    }
});