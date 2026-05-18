import { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";


interface Channel {
    channel: string;
    channel_id: string;
}

export default function Home() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        const fetchChannels = async () => {
            const snapshot = await getDocs(collection(db, "allowed-channel"));
            const list = snapshot.docs.map(doc => doc.data() as Channel);
            setChannels(list);
        };
        fetchChannels();
    }, []);
    return (
        <div className="p-4">
            {channels.map(ch => (
                <button
                    key={ch.channel_id}
                    onClick={() =>
                        navigate(`/channel/${ch.channel_id}`)
                    }
                    className="p-2 m-2 bg-blue-500 text-white rounded"
                    >
                        {ch.channel}
                    </button>
            ))}
        </div>
    )
}